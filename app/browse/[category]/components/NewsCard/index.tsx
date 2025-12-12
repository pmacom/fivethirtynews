'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { Tweet } from 'react-tweet';
import BadgePanel from '../BadgePanel';
import RichEmbed from '../RichEmbed';
import CommentThread, { CommentPreview } from '../CommentThread';
import TagChipBar from '../TagChips';
import { EditButton } from '@/viewer/ui/details/components/icons/EditButton';
import { EditTagsButton } from '@/viewer/ui/details/components/icons/EditTagsButton';

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
        bg-black/80 border-2 border-white/20 rounded-xl overflow-hidden
        transition-all duration-300
        hover:border-white/40 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]
        ${isExpanded ? 'border-[#ffd700]/50 shadow-[0_0_30px_rgba(255,215,0,0.15)]' : ''}
      `}
    >
      {/* Three-column layout: Sidebar | Content | Comments */}
      <div className="grid grid-cols-1 lg:grid-cols-[160px_1fr_300px]">
        {/* LEFT: Arcade Sidebar */}
        <div className="p-3 border-b lg:border-b-0 lg:border-r-2 border-white/20 bg-black/50 flex flex-col gap-3">
          {/* Labels Section */}
          <div>
            <span className="text-[10px] uppercase tracking-widest text-white/40 mb-2 block font-bold">
              Labels
            </span>
            {!labelsLoading && labels.length > 0 ? (
              <BadgePanel labels={labels} size="lg" orientation="vertical" />
            ) : (
              <span className="text-xs text-white/30 italic">None</span>
            )}
          </div>

          {/* Actions & Tags Section */}
          <div className="pt-3 border-t border-white/20">
            <span className="text-[10px] uppercase tracking-widest text-white/40 mb-2 block font-bold">
              Actions
            </span>

            {/* Edit buttons row */}
            <div className="flex gap-2 mb-3">
              <EditButton
                contentId={content.id}
                contentData={{
                  id: content.id,
                  content_url: contentUrl,
                  content_type: platform,
                  title: content.title,
                  description: content.description,
                  author_name: content.author_name,
                  author_username: content.author_username,
                }}
              />
              <EditTagsButton
                contentId={content.id}
                contentData={{
                  id: content.id,
                  content_url: contentUrl,
                  content_type: platform,
                  title: content.title,
                  description: content.description,
                  author_name: content.author_name,
                  author_username: content.author_username,
                }}
              />
            </div>

            {/* Tags - grouped with actions */}
            {displayTags.length > 0 && (
              <TagChipBar tags={displayTags} maxVisible={4} size="sm" />
            )}
          </div>
        </div>

        {/* CENTER: Content with arcade treatment */}
        <div className="p-4 border-b lg:border-b-0 lg:border-r-2 border-white/20 bg-black/60">
          {isTwitter && contentId ? (
            // Full Tweet Embed - themed for arcade
            <div
              className="[&_.react-tweet-theme]:!bg-transparent [&_.react-tweet-theme]:!border-white/20 [&_article]:!bg-black/30 [&_article]:!border-white/20 [&_a]:!text-[#00ffff] [&_span]:!text-white/80"
            >
              <Tweet
                id={contentId}
                fallback={
                  <div className="flex items-center justify-center p-8 bg-black/30 rounded-lg border-2 border-white/20">
                    <div className="animate-pulse text-white/50">Loading tweet...</div>
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
                <p className="text-sm text-white/60 mb-4 line-clamp-3">
                  {content.description}
                </p>
              )}

              {/* Thumbnail */}
              {content.thumbnail_url ? (
                <div className="relative w-full max-w-md aspect-video rounded-lg overflow-hidden bg-black/50 border-2 border-white/20 mb-4 group">
                  <img
                    src={content.thumbnail_url}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {isYouTube && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/30 transition-colors">
                      <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,0,0,0.5)] group-hover:shadow-[0_0_30px_rgba(255,0,0,0.7)] transition-shadow">
                        <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full max-w-md aspect-video rounded-lg bg-black/50 border-2 border-white/20 flex items-center justify-center mb-4">
                  <span className="text-white/30 text-4xl capitalize">{platform[0]}</span>
                </div>
              )}

              {/* Meta info */}
              <div className="flex items-center gap-3 text-xs text-white/40">
                {content.author_name && (
                  <span className="text-white/60">@{content.author_username || content.author_name}</span>
                )}
                <span>{formatDate(content.created_at)}</span>
                <span className="text-white/20">•</span>
                <span className="capitalize">{platform}</span>
              </div>
            </div>
          )}

          {/* External link with arcade glow */}
          <div className="mt-4 pt-4 border-t border-white/20">
            <a
              href={contentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-[#00ffff] hover:text-white transition-all group"
            >
              <ExternalLink className="w-4 h-4 group-hover:drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]" />
              <span className="group-hover:drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]">Open original</span>
            </a>
          </div>
        </div>

        {/* RIGHT: Comments panel */}
        <div className="bg-black/70 min-h-[200px] max-h-[500px] overflow-hidden">
          <CommentThread contentId={content.id} />
        </div>
      </div>
    </div>
  );
}
