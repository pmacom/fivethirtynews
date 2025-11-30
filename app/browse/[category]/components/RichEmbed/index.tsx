'use client';

import TwitterEmbed from './TwitterEmbed';
import YouTubeEmbed from './YouTubeEmbed';
import GenericEmbed from './GenericEmbed';

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
}

interface RichEmbedProps {
  content: ContentItem;
  variant?: 'preview' | 'full';
}

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Detect platform from URL if not provided
function detectPlatform(url: string, platform?: string): string {
  if (platform) return platform.toLowerCase();

  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('github.com')) return 'github';
  if (url.includes('reddit.com')) return 'reddit';

  return 'generic';
}

export default function RichEmbed({ content, variant = 'full' }: RichEmbedProps) {
  // Normalize legacy fields
  const url = content.url || content.content_url || '';
  const contentId = content.platform_content_id || content.content_id || '';
  const platformType = content.platform || content.content_type;
  const platform = detectPlatform(url, platformType);

  switch (platform) {
    case 'twitter':
      return (
        <TwitterEmbed
          tweetId={contentId}
          variant={variant}
        />
      );

    case 'youtube': {
      const videoId = extractYouTubeId(url) || contentId;
      return (
        <YouTubeEmbed
          videoId={videoId}
          title={content.title || undefined}
          thumbnailUrl={content.thumbnail_url || undefined}
          variant={variant}
        />
      );
    }

    default:
      return (
        <GenericEmbed
          url={url}
          title={content.title || undefined}
          description={content.description || undefined}
          thumbnailUrl={content.thumbnail_url || undefined}
          platform={platform}
          authorName={content.author_username || content.author_name || undefined}
          variant={variant}
        />
      );
  }
}

export { TwitterEmbed, YouTubeEmbed, GenericEmbed };
