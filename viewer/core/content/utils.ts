// Helper to extract best mp4 from variants array
function extractBestMp4(variants: any[], urlField: 'url' | 'src' = 'url'): string | null {
  if (!variants || !Array.isArray(variants)) return null;

  const mp4s = variants
    .filter((v: any) => {
      const contentType = v.content_type || v.type || '';
      return contentType.includes('video/mp4') || (urlField === 'url' && v.url?.includes('.mp4'));
    })
    .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

  if (mp4s.length > 0) {
    return mp4s[0][urlField] || null;
  }
  return null;
}

// Extract video URLs from a tweet data object (not the full API response)
function extractVideoUrlsFromTweetData(data: any): string[] {
  const videoUrls: string[] = [];
  if (!data) return videoUrls;

  // Method 1: mediaDetails (Twitter API v2 / syndication format)
  if (data.mediaDetails && Array.isArray(data.mediaDetails)) {
    data.mediaDetails.forEach((media: any) => {
      if (media.type === 'video' && media.video_info?.variants) {
        const url = extractBestMp4(media.video_info.variants, 'url');
        if (url) videoUrls.push(url);
      }
    });
  }

  // Method 2: video field (syndication format)
  if (data.video?.variants) {
    const url = extractBestMp4(data.video.variants, 'src');
    if (url) videoUrls.push(url);
  }

  // Method 3: extended_entities (older Twitter API format)
  if (data.extended_entities?.media && Array.isArray(data.extended_entities.media)) {
    data.extended_entities.media.forEach((media: any) => {
      if (media.type === 'video' && media.video_info?.variants) {
        const url = extractBestMp4(media.video_info.variants, 'url');
        if (url) videoUrls.push(url);
      }
    });
  }

  // Method 4: entities.media (fallback)
  if (data.entities?.media && Array.isArray(data.entities.media)) {
    data.entities.media.forEach((media: any) => {
      if (media.type === 'video' && media.video_info?.variants) {
        const url = extractBestMp4(media.video_info.variants, 'url');
        if (url) videoUrls.push(url);
      }
    });
  }

  return videoUrls;
}

// Extract image URLs from a tweet data object
function extractImageUrlsFromTweetData(data: any): string[] {
  const imageUrls: string[] = [];
  if (!data) return imageUrls;

  // Method 1: photos array (syndication format)
  if (data.photos && Array.isArray(data.photos)) {
    data.photos.forEach((photo: any) => {
      if (photo.url) imageUrls.push(photo.url);
    });
  }

  // Method 2: mediaDetails (Twitter API v2 format)
  if (data.mediaDetails && Array.isArray(data.mediaDetails)) {
    data.mediaDetails.forEach((media: any) => {
      if (media.type === 'photo' && media.media_url_https) {
        imageUrls.push(media.media_url_https);
      }
    });
  }

  // Method 3: extended_entities (older format)
  if (data.extended_entities?.media && Array.isArray(data.extended_entities.media)) {
    data.extended_entities.media.forEach((media: any) => {
      if (media.type === 'photo' && media.media_url_https) {
        imageUrls.push(media.media_url_https);
      }
    });
  }

  // Method 4: entities.media (fallback)
  if (data.entities?.media && Array.isArray(data.entities.media)) {
    data.entities.media.forEach((media: any) => {
      if (media.type === 'photo' && media.media_url_https) {
        imageUrls.push(media.media_url_https);
      }
    });
  }

  return imageUrls;
}

// Function to extract video URLs from tweet data
// Handles multiple Twitter data formats and returns highest quality mp4
export function extractVideoUrls(apiResponse: any): string[] {
  if (!apiResponse?.data) {
    return [];
  }

  const data = apiResponse.data;
  const videoUrls = extractVideoUrlsFromTweetData(data);

  // Remove duplicates
  return [...new Set(videoUrls)];
}

/**
 * Check if a tweet has been tombstoned (deleted from Twitter)
 * Tombstoned tweets have data like: {"tombstone": {}, "__typename": "TweetTombstone"}
 */
export function isTombstonedTweet(apiResponse: any): boolean {
  if (!apiResponse?.data) return false;
  const data = apiResponse.data;
  return data.__typename === 'TweetTombstone' || data.tombstone !== undefined;
}

/**
 * Quoted tweet information for display
 */
export interface QuotedTweetInfo {
  text: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string | null;
  isVerified: boolean;
  isBlueVerified: boolean;
  videoUrl: string | null;
  imageUrl: string | null;
  posterUrl: string | null;
}

/**
 * Check if a tweet is a quote tweet (has quoted content)
 */
export function isQuoteTweet(apiResponse: any): boolean {
  return !!(apiResponse?.data?.quoted_tweet);
}

/**
 * Extract quoted tweet information from a tweet
 * Returns null if this is not a quote tweet
 */
export function extractQuotedTweetInfo(apiResponse: any): QuotedTweetInfo | null {
  const quotedTweet = apiResponse?.data?.quoted_tweet;
  if (!quotedTweet) return null;

  // Extract video from quoted tweet
  const videoUrls = extractVideoUrlsFromTweetData(quotedTweet);
  const videoUrl = videoUrls.length > 0 ? videoUrls[0] : null;

  // Extract images from quoted tweet
  const imageUrls = extractImageUrlsFromTweetData(quotedTweet);
  const imageUrl = imageUrls.length > 0 ? imageUrls[0] : null;

  // Get poster (for video thumbnails or fallback image)
  const posterUrl = quotedTweet.video?.poster
    || quotedTweet.mediaDetails?.[0]?.media_url_https
    || imageUrl
    || null;

  // Extract author info
  const user = quotedTweet.user || {};

  return {
    text: quotedTweet.text || '',
    authorName: user.name || 'Unknown',
    authorUsername: user.screen_name || 'unknown',
    authorAvatar: user.profile_image || null,
    isVerified: user.verified || false,
    isBlueVerified: user.is_blue_verified || false,
    videoUrl,
    imageUrl,
    posterUrl,
  };
}

/**
 * Get the best media to display for a tweet, checking quoted tweet if main has no media
 * This is useful when someone quote-tweets media content with their own comment
 */
export function getBestTweetMedia(apiResponse: any): {
  videoUrl: string | null;
  imageUrl: string | null;
  posterUrl: string | null;
  isFromQuotedTweet: boolean;
} {
  if (!apiResponse?.data) {
    return { videoUrl: null, imageUrl: null, posterUrl: null, isFromQuotedTweet: false };
  }

  const data = apiResponse.data;

  // First check the main tweet for media
  const mainVideoUrls = extractVideoUrlsFromTweetData(data);
  const mainImageUrls = extractImageUrlsFromTweetData(data);

  if (mainVideoUrls.length > 0 || mainImageUrls.length > 0) {
    return {
      videoUrl: mainVideoUrls[0] || null,
      imageUrl: mainImageUrls[0] || null,
      posterUrl: data.video?.poster || data.mediaDetails?.[0]?.media_url_https || mainImageUrls[0] || null,
      isFromQuotedTweet: false,
    };
  }

  // If main tweet has no media, check the quoted tweet
  const quotedInfo = extractQuotedTweetInfo(apiResponse);
  if (quotedInfo && (quotedInfo.videoUrl || quotedInfo.imageUrl)) {
    return {
      videoUrl: quotedInfo.videoUrl,
      imageUrl: quotedInfo.imageUrl,
      posterUrl: quotedInfo.posterUrl,
      isFromQuotedTweet: true,
    };
  }

  // No media found
  return { videoUrl: null, imageUrl: null, posterUrl: null, isFromQuotedTweet: false };
}