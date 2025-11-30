'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ModComment from './ModComment';

interface ModeratorComment {
  id: string;
  comment_text: string;
  comment_type: 'note' | 'context' | 'warning' | 'highlight' | 'question';
  is_pinned: boolean;
  is_public: boolean;
  author_name: string;
  author_avatar?: string;
  author_role: 'admin' | 'moderator';
  created_at: string;
}

interface CommentThreadProps {
  contentId: string;
  previewMode?: boolean;
  maxPreviewComments?: number;
}

export default function CommentThread({
  contentId,
  previewMode = false,
  maxPreviewComments = 2,
}: CommentThreadProps) {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<ModeratorComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const canComment = isAuthenticated && user && (user.is_admin || user.is_moderator);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    async function fetchComments() {
      try {
        const res = await fetch(`/api/content/${contentId}/mod-comments`);
        const data = await res.json();

        if (data.success) {
          setComments(data.data);
        } else {
          setError(data.error);
        }
      } catch {
        setError('Failed to load comments');
      } finally {
        setLoading(false);
      }
    }

    fetchComments();
  }, [contentId]);

  // Scroll to bottom when comments load or new comment added
  useEffect(() => {
    if (!loading && comments.length > 0) {
      scrollToBottom();
    }
  }, [loading, comments.length]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting || !canComment) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/content/${contentId}/mod-comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment_text: newComment.trim(),
          comment_type: 'note',
          is_public: true,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setComments((prev) => [...prev, data.data]);
        setNewComment('');
        setTimeout(scrollToBottom, 100);
      } else {
        console.error('Failed to post comment:', data.error);
      }
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const [showInput, setShowInput] = useState(false);

  // Loading state - only show for mods or if we might have comments
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 h-full">
        <div className="animate-pulse text-zinc-500 text-sm">Loading...</div>
      </div>
    );
  }

  // Error state - only show to mods
  if (error && canComment) {
    return (
      <div className="text-center p-4 text-zinc-500 text-sm h-full flex items-center justify-center">
        {error}
      </div>
    );
  }

  // No comments + not a mod = show nothing
  if (comments.length === 0 && !canComment) {
    return null;
  }

  // No comments + is a mod = show "Add note" button (collapsed state)
  if (comments.length === 0 && canComment && !showInput) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <button
          onClick={() => setShowInput(true)}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-700/50 hover:bg-zinc-700 border border-zinc-600 hover:border-zinc-500 rounded-lg text-sm text-zinc-400 hover:text-white transition-all"
        >
          <MessageSquare className="w-4 h-4" />
          Add note
        </button>
      </div>
    );
  }

  const displayComments = previewMode
    ? comments.slice(0, maxPreviewComments)
    : comments;
  const hiddenCount = comments.length - displayComments.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header - only show if there are comments */}
      {comments.length > 0 && (
        <div className="px-3 py-2 border-b border-zinc-700 flex-shrink-0">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
            Mod Notes ({comments.length})
          </span>
        </div>
      )}

      {/* Comments list - scrollable */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-3"
      >
        {displayComments.map((comment) => (
          <ModComment
            key={comment.id}
            id={comment.id}
            commentText={comment.comment_text}
            commentType={comment.comment_type}
            isPinned={comment.is_pinned}
            authorName={comment.author_name}
            authorAvatar={comment.author_avatar}
            authorRole={comment.author_role}
            createdAt={comment.created_at}
          />
        ))}

        {hiddenCount > 0 && (
          <p className="text-center text-xs text-zinc-500 py-2">
            +{hiddenCount} more comment{hiddenCount !== 1 ? 's' : ''}
          </p>
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Chat input for mods/admins */}
      {canComment && (comments.length > 0 || showInput) && (
        <form
          onSubmit={handleSubmit}
          className="flex-shrink-0 border-t border-zinc-700 p-3"
        >
          <div className="flex items-start gap-2">
            {/* User avatar */}
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.display_name}
                className="w-8 h-8 rounded-full flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-zinc-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {user?.display_name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}

            {/* Chat bubble input */}
            <div className="flex-1 relative">
              <div className="bg-zinc-700/50 rounded-2xl overflow-hidden border border-zinc-600 focus-within:border-green-500/50 transition-colors">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a note..."
                  rows={1}
                  className="w-full bg-transparent text-sm text-white placeholder-zinc-500 px-4 py-2 pr-10 resize-none focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
              </div>

              {/* Send button */}
              <button
                type="submit"
                disabled={!newComment.trim() || submitting}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-green-400 disabled:opacity-50 disabled:hover:text-zinc-400 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

// Preview component for collapsed card
export function CommentPreview({
  contentId,
  maxComments = 1,
}: {
  contentId: string;
  maxComments?: number;
}) {
  const [comments, setComments] = useState<ModeratorComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchComments() {
      try {
        const res = await fetch(`/api/content/${contentId}/mod-comments`);
        const data = await res.json();
        if (data.success) {
          setComments(data.data.slice(0, maxComments));
        }
      } catch {
        // Silently fail for preview
      } finally {
        setLoading(false);
      }
    }

    fetchComments();
  }, [contentId, maxComments]);

  if (loading || comments.length === 0) {
    return null;
  }

  const comment = comments[0];

  return (
    <div className="text-xs text-zinc-400 line-clamp-2">
      <span className="font-medium text-green-400">{comment.author_name}:</span>{' '}
      {comment.comment_text}
    </div>
  );
}

export { ModComment };
