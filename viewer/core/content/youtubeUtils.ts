/**
 * YouTube Utilities
 *
 * Helper functions for working with YouTube videos
 */

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  // Regular YouTube URLs: https://www.youtube.com/watch?v=VIDEO_ID
  const standardMatch = url.match(/[?&]v=([^&]+)/);
  if (standardMatch) return standardMatch[1];

  // Short YouTube URLs: https://youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?]+)/);
  if (shortMatch) return shortMatch[1];

  // Embed URLs: https://www.youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([^?]+)/);
  if (embedMatch) return embedMatch[1];

  return null;
}

/**
 * Check if URL is a YouTube video
 */
export function isYouTubeUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('youtube.com') || url.includes('youtu.be');
}

/**
 * Get YouTube thumbnail URL for a video ID
 *
 * Quality options:
 * - maxresdefault: 1920x1080 (not always available)
 * - sddefault: 640x480
 * - hqdefault: 480x360 (most reliable)
 * - mqdefault: 320x180
 * - default: 120x90
 */
export function getYouTubeThumbnailUrl(videoId: string, quality: 'maxresdefault' | 'sddefault' | 'hqdefault' | 'mqdefault' | 'default' = 'hqdefault'): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

/**
 * Get YouTube watch URL from video ID
 */
export function getYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Get YouTube data for a URL (if it's a YouTube video)
 */
export interface YouTubeVideoData {
  isYouTube: boolean;
  videoId: string | null;
  thumbnailUrl: string | null;
  watchUrl: string | null;
}

export function getYouTubeVideoData(url: string): YouTubeVideoData {
  const isYouTube = isYouTubeUrl(url);

  if (!isYouTube) {
    return {
      isYouTube: false,
      videoId: null,
      thumbnailUrl: null,
      watchUrl: null,
    };
  }

  const videoId = extractYouTubeVideoId(url);

  if (!videoId) {
    return {
      isYouTube: true,
      videoId: null,
      thumbnailUrl: null,
      watchUrl: null,
    };
  }

  return {
    isYouTube: true,
    videoId,
    thumbnailUrl: getYouTubeThumbnailUrl(videoId, 'hqdefault'),
    watchUrl: getYouTubeWatchUrl(videoId),
  };
}
