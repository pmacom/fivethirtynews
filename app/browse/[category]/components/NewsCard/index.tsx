'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { Tweet } from 'react-tweet';
import BadgePanel from '../BadgePanel';
import RichEmbed from '../RichEmbed';
import CommentThread, { CommentPreview } from '../CommentThread';
import TagChipBar from '../TagChips';

interface ContentLabel {
  id: string;
  slug: string;
  name: string;
  color: string;
  text_color: string;
  icon?: string;
}

interface ContentItem {
  id: string;
  platform?: string;
  content_type?: string; // Legacy field
  platform_content_id?: string;
  content_id?: string; // Legacy field
  url?: string;
  content_url?: string; // Legacy field
  title?: string | null;
  description?: string | null;
  thumbnail_url?: string | null;
  author_name?: string | null;
  author_username?: string | null;
  created_at: string;
  tags?: string[];
  primary_channel?: string;
  channels?: string[];
}

interface NewsCardProps {
  content: ContentItem;
  isExpanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
}

export default function NewsCard({
  content,
  isExpanded: controlledExpanded,
  onExpandChange,
}: NewsCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [labels, setLabels] = useState<ContentLabel[]>([]);
  const [labelsLoading, setLabelsLoading] = useState(true);

  // Support both controlled and uncontrolled modes
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    if (onExpandChange) {
      onExpandChange(newExpanded);
    } else {
      setInternalExpanded(newExpanded);
    }
  };

  // Fetch labels for this content
  useEffect(() => {
    async function fetchLabels() {
      try {
        const res = await fetch(`/api/content/${content.id}/labels`);
        const data = await res.json();
        if (data.success) {
          setLabels(data.data);
        }
      } catch {
        // Silently fail
      } finally {
        setLabelsLoading(false);
      }
    }

    fetchLabels();
  }, [content.id]);

  // Combine channels and tags for display
  const displayTags = [
    ...(content.primary_channel ? [content.primary_channel] : []),
    ...(content.channels || []).filter((c) => c !== content.primary_channel),
    ...(content.tags || []),
  ].filter((v, i, a) => a.indexOf(v) === i); // unique

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Normalize legacy fields
  const platform = content.platform || content.content_type || 'unknown';
  const contentId = content.platform_content_id || content.content_id || '';
  const contentUrl = content.url || content.content_url || '';
  const isTwitter = platform === 'twitter';
  const isYouTube = platform === 'youtube';

  // Extract YouTube video ID
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return match ? match[1] : null;
  };

  const youtubeId = isYouTube ? (contentId || getYouTubeId(contentUrl)) : null;

  return (
    <div
      className={`
        bg-zinc-800/50 border border-zinc-700/50 rounded-xl overflow-hidden
        transition-all duration-300
        ${isExpanded ? 'border-green-500/30 shadow-lg shadow-green-500/5' : 'hover:border-zinc-600'}
      `}
    >
      {/* Three-column layout: Badges | Content | Comments */}
      <div className="grid grid-cols-1 lg:grid-cols-[140px_1fr_300px]">
        {/* LEFT: Large Badges */}
        <div className="p-4 border-b lg:border-b-0 lg:border-r border-zinc-700/50 bg-zinc-800/30 flex flex-col gap-3">
          {!labelsLoading && labels.length > 0 ? (
            <BadgePanel labels={labels} size="lg" orientation="vertical" />
          ) : (
            <div className="text-xs text-zinc-600 italic">No labels</div>
          )}

          {/* Tags below badges */}
          {displayTags.length > 0 && (
            <div className="mt-auto pt-3 border-t border-zinc-700/50">
              <TagChipBar tags={displayTags} maxVisible={3} size="sm" />
            </div>
          )}
        </div>

        {/* CENTER: Full Content (Tweet or other) */}
        <div className="p-4 border-b lg:border-b-0 lg:border-r border-zinc-700/50">
          {isTwitter && contentId ? (
            // Full Tweet Embed
            <div
              className="[&_.react-tweet-theme]:!bg-transparent [&_.react-tweet-theme]:!border-zinc-700 [&_article]:!bg-zinc-800/50 [&_article]:!border-zinc-700 [&_a]:!text-green-400 [&_span]:!text-zinc-300"
            >
              <Tweet
                id={contentId}
                fallback={
                  <div className="flex items-center justify-center p-8 bg-zinc-800/50 rounded-lg border border-zinc-700">
                    <div className="animate-pulse text-zinc-500">Loading tweet...</div>
                  </div>
                }
              />
            </div>
          ) : (
            // Non-Twitter content with thumbnail
            <div>
              {/* Title and description */}
              <h3 className="font-semibold text-white text-lg mb-2">
                {content.title || 'Untitled'}
              </h3>

              {content.description && (
                <p className="text-sm text-zinc-400 mb-4 line-clamp-3">
                  {content.description}
                </p>
              )}

              {/* Thumbnail */}
              {content.thumbnail_url ? (
                <div className="relative w-full max-w-md aspect-video rounded-lg overflow-hidden bg-zinc-700 mb-4">
                  <img
                    src={content.thumbnail_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {isYouTube && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full max-w-md aspect-video rounded-lg bg-zinc-700/50 flex items-center justify-center mb-4">
                  <span className="text-zinc-500 text-4xl capitalize">{platform[0]}</span>
                </div>
              )}

              {/* Meta info */}
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                {content.author_name && (
                  <span className="text-zinc-400">@{content.author_username || content.author_name}</span>
                )}
                <span>{formatDate(content.created_at)}</span>
                <span className="text-zinc-600">•</span>
                <span className="capitalize">{platform}</span>
              </div>
            </div>
          )}

          {/* External link */}
          <div className="mt-4 pt-4 border-t border-zinc-700/50">
            <a
              href={contentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-green-400 hover:text-green-300 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open original
            </a>
          </div>
        </div>

        {/* RIGHT: Comments (chat-like) */}
        <div className="bg-zinc-900/50 min-h-[200px] max-h-[500px] overflow-hidden">
          <CommentThread contentId={content.id} />
        </div>
      </div>
    </div>
  );
}
