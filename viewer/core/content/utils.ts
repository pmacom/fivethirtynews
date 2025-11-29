// Function to extract video URLs from tweet data
// Handles multiple Twitter data formats and returns highest quality mp4
export function extractVideoUrls(apiResponse: any): string[] {
  const videoUrls: string[] = [];

  if (!apiResponse?.data) {
    return videoUrls;
  }

  const data = apiResponse.data;

  // Helper to extract best mp4 from variants array
  const extractBestMp4 = (variants: any[], urlField: 'url' | 'src' = 'url'): string | null => {
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
  };

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

  // Remove duplicates
  return [...new Set(videoUrls)];
}