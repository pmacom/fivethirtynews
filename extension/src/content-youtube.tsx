// 530 Content Script - YouTube (React)
import { showPopup, updateButtonAppearance, createButton, isExtensionContextValid } from './shared/popup';

console.log('530 Extension: YouTube React content script loaded');

// Configuration
const CONFIG = {
  buttonClass: 'five-thirty-button-youtube',
  containerClass: 'five-thirty-container-youtube',
};

// Track which videos already have buttons
const processedVideos = new WeakSet<Element>();
const videoStatusCache = new Map<string, { exists: boolean; content: any }>();

// Extract video ID from current URL
function getVideoId(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

// Check if video exists in database
async function checkVideoStatus(videoId: string) {
  if (videoStatusCache.has(videoId)) {
    return videoStatusCache.get(videoId)!;
  }

  try {
    if (!isExtensionContextValid()) {
      console.warn('530: Extension context invalidated - please refresh the page');
      return { exists: false, content: null };
    }

    const response = await chrome.runtime.sendMessage({
      action: 'checkContentExists',
      data: { platform: 'youtube', contentId: videoId },
    });

    const status = response.success ? response.data : { exists: false, content: null };
    videoStatusCache.set(videoId, status);
    return status;
  } catch (error: any) {
    if (error?.message?.includes('Extension context invalidated')) {
      console.warn('530: Extension was reloaded - please refresh this page');
    } else {
      console.error('530: Failed to check video status', error);
    }
    return { exists: false, content: null };
  }
}

// Parse YouTube date text to ISO timestamp
function parseDateText(dateText: string | null): string | null {
  if (!dateText) return null;

  try {
    const cleanDate = dateText
      .replace(/Premiered\s+/i, '')
      .replace(/Streamed live on\s+/i, '')
      .trim();

    const parsed = new Date(cleanDate);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
    return null;
  } catch {
    return null;
  }
}

// Parse ISO 8601 duration format (e.g., "PT2M34S" -> 154 seconds)
function parseISO8601Duration(duration: string | null): number | null {
  if (!duration) return null;

  try {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return null;

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    return hours * 3600 + minutes * 60 + seconds;
  } catch {
    return null;
  }
}

// Extract channel username from URL
function extractChannelUsername(channelUrl: string | null): string | null {
  if (!channelUrl) return null;

  try {
    const match = channelUrl.match(/\/@([^/]+)|\/c\/([^/]+)|\/user\/([^/]+)|\/channel\/([^/]+)/);
    if (match) {
      return match[1] || match[2] || match[3] || match[4];
    }
    return null;
  } catch {
    return null;
  }
}

// Extract video metadata from page
function extractVideoMetadata() {
  const videoId = getVideoId();
  if (!videoId) return null;

  // Extract title
  const titleElement =
    document.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string') ||
    document.querySelector('h1.ytd-watch-metadata yt-formatted-string') ||
    document.querySelector('h1.title yt-formatted-string') ||
    document.querySelector('meta[name="title"]') ||
    document.querySelector('meta[property="og:title"]');
  const title =
    (titleElement as HTMLElement)?.textContent?.trim() ||
    (titleElement as HTMLMetaElement)?.content ||
    document.title.replace(' - YouTube', '');

  // Extract description
  const descriptionElement =
    document.querySelector('#description-inline-expander yt-formatted-string') ||
    document.querySelector('#description yt-formatted-string') ||
    document.querySelector('.ytd-expandable-video-description-body-renderer') ||
    document.querySelector('meta[name="description"]') ||
    document.querySelector('meta[property="og:description"]');
  const description =
    (descriptionElement as HTMLElement)?.textContent?.trim() ||
    (descriptionElement as HTMLMetaElement)?.content;

  // Extract channel info
  const channelElement =
    document.querySelector('#channel-name a') ||
    document.querySelector('ytd-channel-name a') ||
    document.querySelector('#owner-name a');
  const channelName = (channelElement as HTMLElement)?.textContent?.trim();
  const channelUrl = (channelElement as HTMLAnchorElement)?.getAttribute('href');
  const channelUsername = extractChannelUsername(channelUrl);

  // Extract channel avatar
  const channelAvatarElement =
    document.querySelector('#owner #avatar img') ||
    document.querySelector('ytd-video-owner-renderer img') ||
    document.querySelector('#channel-thumbnail img');
  const channelAvatar = (channelAvatarElement as HTMLImageElement)?.getAttribute('src');

  // Thumbnail URL
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  // Extract view count
  const viewsElement =
    document.querySelector('.ytd-video-view-count-renderer .view-count') ||
    document.querySelector('span.view-count') ||
    document.querySelector('#info span.view-count');
  const viewsText = (viewsElement as HTMLElement)?.textContent?.trim();

  // Extract upload date
  const dateElement =
    document.querySelector('#info-strings yt-formatted-string') ||
    document.querySelector('#info .date') ||
    document.querySelector('meta[itemprop="uploadDate"]');
  const dateText = (dateElement as HTMLElement)?.textContent?.trim() || (dateElement as HTMLMetaElement)?.content;
  const contentCreatedAt = parseDateText(dateText);

  // Extract duration
  const durationMeta = document.querySelector('meta[itemprop="duration"]');
  const durationISO = durationMeta?.getAttribute('content');
  const duration = parseISO8601Duration(durationISO);

  // Get video dimensions
  const videoElement = document.querySelector('video.html5-main-video') as HTMLVideoElement;
  const videoWidth = videoElement?.videoWidth || 1920;
  const videoHeight = videoElement?.videoHeight || 1080;

  return {
    videoId,
    title,
    description,
    channelName,
    channelUsername,
    channelUrl: channelUrl ? `https://www.youtube.com${channelUrl}` : null,
    channelAvatar,
    thumbnailUrl,
    url: window.location.href,
    viewsText,
    dateText,
    contentCreatedAt,
    duration,
    videoWidth,
    videoHeight,
  };
}

// Inject the 530 button
async function injectButton() {
  const videoId = getVideoId();
  if (!videoId) return;

  // Find the actions container
  const actionsContainer =
    document.querySelector('#top-level-buttons-computed') ||
    document.querySelector('ytd-menu-renderer.ytd-video-primary-info-renderer');

  if (!actionsContainer) {
    return;
  }

  // Check if button already exists
  if (actionsContainer.querySelector(`.${CONFIG.containerClass}`)) {
    return;
  }

  // Mark as processed
  if (processedVideos.has(actionsContainer)) return;
  processedVideos.add(actionsContainer);

  // Extract video metadata
  const videoData = extractVideoMetadata();
  if (!videoData) {
    console.error('530: Could not extract video metadata');
    return;
  }

  // Create button container
  const container = document.createElement('div');
  container.className = CONFIG.containerClass;
  container.style.cssText = 'display: inline-flex; align-items: center; margin-left: 8px;';

  // Create the 530 button
  const button = createButton(videoId);
  button.className = CONFIG.buttonClass;
  button.style.borderRadius = '18px';
  button.style.padding = '8px 20px';
  button.style.fontSize = '14px';

  // Check if video already exists
  const videoStatus = await checkVideoStatus(videoId);
  const existingChannels = videoStatus.exists && videoStatus.content?.channels ? videoStatus.content.channels : [];
  const existingPrimaryChannel =
    videoStatus.exists && videoStatus.content?.primary_channel ? videoStatus.content.primary_channel : null;
  updateButtonAppearance(button, videoStatus.exists, existingChannels.length);

  // Click handler
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('530: YouTube button clicked!');

    // Prepare content data
    const postData = {
      platform: 'youtube',
      platformContentId: videoData.videoId,
      url: videoData.url,
      title: videoData.title,
      description: videoData.description,
      author: videoData.channelName,
      authorUsername: videoData.channelUsername,
      authorUrl: videoData.channelUrl,
      authorAvatarUrl: videoData.channelAvatar,
      thumbnailUrl: videoData.thumbnailUrl,
      mediaAssets: [
        {
          type: 'video',
          url: videoData.url,
          width: videoData.videoWidth,
          height: videoData.videoHeight,
          duration: videoData.duration,
          mimeType: 'video/mp4',
        },
        {
          type: 'image',
          url: videoData.thumbnailUrl,
          mimeType: 'image/jpeg',
        },
      ],
      contentCreatedAt: videoData.contentCreatedAt,
      metadata: {
        viewsText: videoData.viewsText,
        dateText: videoData.dateText,
        duration: videoData.duration,
      },
    };

    // Show React popup
    showPopup(button, postData, existingChannels, existingPrimaryChannel, (savedData) => {
      console.log('530: Channels saved for YouTube video', savedData);
      const newChannelCount = savedData.channels ? savedData.channels.length : 0;
      updateButtonAppearance(button, true, newChannelCount);
      videoStatusCache.set(videoId, { exists: true, content: savedData });
    });
  });

  container.appendChild(button);
  actionsContainer.appendChild(container);
  console.log('530: YouTube button injected');
}

// Observe for video changes (YouTube is a SPA)
let currentVideoId: string | null = null;

function checkForNewVideo() {
  const videoId = getVideoId();

  if (videoId && videoId !== currentVideoId) {
    currentVideoId = videoId;
    console.log('530: New video detected:', videoId);

    // Wait for video info to load, then inject button
    setTimeout(() => {
      injectButton();
    }, 1000);
  }
}

function observeVideoChanges() {
  let lastUrl = location.href;
  let urlCheckTimeout: ReturnType<typeof setTimeout>;

  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      clearTimeout(urlCheckTimeout);
      urlCheckTimeout = setTimeout(() => {
        checkForNewVideo();
      }, 100);
    }
  }).observe(document, { subtree: true, childList: true });

  // Also observe for DOM changes
  let injectionTimeout: ReturnType<typeof setTimeout> | null = null;
  const observer = new MutationObserver(() => {
    if (getVideoId() && !injectionTimeout) {
      injectionTimeout = setTimeout(() => {
        injectButton();
        injectionTimeout = null;
      }, 500);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Initial check
  checkForNewVideo();
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observeVideoChanges);
} else {
  observeVideoChanges();
}

console.log('530 Extension: YouTube React observation started');
