// Function to extract all video URLs from the response
export function extractVideoUrls(apiResponse: any) {
  const videoUrls: any = [];

  // Check if apiResponse.data exists
  if (!apiResponse || !apiResponse.data) {
    console.warn("Invalid API response structure:", apiResponse);
    return videoUrls; // Return an empty array if the response is malformed
  }

  // Extract from mediaDetails (only if it exists)
  const mediaDetails = apiResponse.data.mediaDetails;
  if (mediaDetails) {
    mediaDetails.forEach((media: any) => {
      if (media.type === 'video' && media.video_info) {
        const variants = media.video_info.variants;
        variants.forEach((variant: any) => {
          if (variant.url) {
            videoUrls.push(variant.url);
          }
        });
      }
    });
  }

  // Extract from video field (only if it exists)
  const video = apiResponse.data.video;
  if (video) {
    video.variants.forEach((variant: any) => {
      if (variant.src) {
        videoUrls.push(variant.src);
      }
    });
  }

  return videoUrls;
}