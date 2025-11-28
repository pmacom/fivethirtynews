'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface PendingContent {
  id: string;
  platform: string;
  title: string | null;
  description: string | null;
  content_url: string;
  thumbnail_url: string | null;
  submitted_at: string;
  submitted_by: string;
  submitter?: {
    display_name: string;
    discord_avatar: string | null;
  };
}

export default function ModeratePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [pendingContent, setPendingContent] = useState<PendingContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && (!user || !user.is_moderator)) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user?.is_moderator) {
      fetchPendingContent();
    }
  }, [user]);

  const fetchPendingContent = async () => {
    try {
      const response = await fetch('/api/content/pending');
      const data = await response.json();
      if (data.success) {
        setPendingContent(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch pending content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/content/${id}/approve`, {
        method: 'POST',
      });
      if (response.ok) {
        setPendingContent(prev => prev.filter(item => item.id !== id));
      }
    } catch (error) {
      console.error('Failed to approve:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Rejection reason (optional):');
    setActionLoading(id);
    try {
      const response = await fetch(`/api/content/${id}/approve?action=reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (response.ok) {
        setPendingContent(prev => prev.filter(item => item.id !== id));
      }
    } catch (error) {
      console.error('Failed to reject:', error);
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading || !user?.is_moderator) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-arcade-yellow">Content Moderation</h1>
            <p className="text-zinc-400 mt-1">Review and approve pending content submissions</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
          >
            Back to Home
          </button>
        </div>

        {/* Stats */}
        <div className="bg-zinc-800 rounded-lg p-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-arcade-cyan">{pendingContent.length}</div>
            <div className="text-zinc-400">pending items</div>
          </div>
        </div>

        {/* Content List */}
        {loading ? (
          <div className="text-center py-12 text-zinc-400">Loading pending content...</div>
        ) : pendingContent.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✓</div>
            <div className="text-xl text-zinc-400">No pending content to review</div>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingContent.map((item) => (
              <div
                key={item.id}
                className="bg-zinc-800 rounded-lg p-6 border border-zinc-700"
              >
                <div className="flex gap-6">
                  {/* Thumbnail */}
                  {item.thumbnail_url && (
                    <div className="flex-shrink-0 w-32 h-32 bg-zinc-700 rounded-lg overflow-hidden">
                      <img
                        src={item.thumbnail_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Content Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="inline-block px-2 py-0.5 bg-zinc-700 text-xs rounded uppercase mb-2">
                          {item.platform}
                        </span>
                        <h3 className="text-lg font-semibold truncate">
                          {item.title || item.description || 'Untitled'}
                        </h3>
                        {item.description && item.title && (
                          <p className="text-zinc-400 text-sm mt-1 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-4 text-sm text-zinc-400">
                      <span>
                        Submitted by: {item.submitter?.display_name || item.submitted_by}
                      </span>
                      <span>
                        {new Date(item.submitted_at).toLocaleDateString()}
                      </span>
                      <a
                        href={item.content_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-arcade-cyan hover:underline"
                      >
                        View Original
                      </a>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleApprove(item.id)}
                      disabled={actionLoading === item.id}
                      className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg font-semibold transition-colors"
                    >
                      {actionLoading === item.id ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(item.id)}
                      disabled={actionLoading === item.id}
                      className="px-6 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg font-semibold transition-colors"
                    >
                      {actionLoading === item.id ? '...' : 'Reject'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
