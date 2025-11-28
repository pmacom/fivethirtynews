// 530 Content Script - Bluesky (React)
import { showPopup, updateButtonAppearance, createButton, isExtensionContextValid } from './shared/popup';

console.log('530 Extension: Bluesky React content script loaded');

// Configuration
const CONFIG = {
  buttonClass: 'five-thirty-button-bluesky',
  containerClass: 'five-thirty-container-bluesky',
};

// Track which posts already have buttons
const processedPosts = new WeakSet<Element>();
const postStatusCache = new Map<string, { exists: boolean; content: any }>();

// Extract post ID from URL or element
function getPostId(element: Element): string | null {
  // Try URL first
  const urlMatch = window.location.href.match(/\/post\/([\w]+)/);
  if (urlMatch) return urlMatch[1];

  // Try from element links
  const linkElement = element.querySelector('a[href*="/post/"]');
  if (linkElement) {
    const match = (linkElement as HTMLAnchorElement).href.match(/\/post\/([\w]+)/);
    if (match) return match[1];
  }

  return null;
}

// Check if post exists in database
async function checkPostStatus(postId: string) {
  if (postStatusCache.has(postId)) {
    return postStatusCache.get(postId)!;
  }

  try {
    if (!isExtensionContextValid()) {
      console.warn('530: Extension context invalidated - please refresh the page');
      return { exists: false, content: null };
    }

    const response = await chrome.runtime.sendMessage({
      action: 'checkContentExists',
      data: { platform: 'bluesky', contentId: postId },
    });

    const status = response.success ? response.data : { exists: false, content: null };
    postStatusCache.set(postId, status);
    return status;
  } catch (error: any) {
    if (error?.message?.includes('Extension context invalidated')) {
      console.warn('530: Extension was reloaded - please refresh this page');
    } else {
      console.error('530: Failed to check post status', error);
    }
    return { exists: false, content: null };
  }
}

// Extract post metadata from DOM
function extractPostMetadata(postElement: Element) {
  const postId = getPostId(postElement);
  if (!postId) return null;

  // Extract post text
  const textElement =
    postElement.querySelector('[data-testid="postText"]') ||
    postElement.querySelector('[class*="postText"]') ||
    postElement.querySelector('div[dir="auto"]');
  const postText = (textElement as HTMLElement)?.textContent?.trim();

  // Extract post URL
  const linkElement = postElement.querySelector('a[href*="/post/"]');
  const postUrl = (linkElement as HTMLAnchorElement)?.href || window.location.href;

  // Extract author info
  const authorElement =
    postElement.querySelector('[data-testid="authorName"]') || postElement.querySelector('a[href*="/profile/"]');
  const authorName = (authorElement as HTMLElement)?.textContent?.trim();

  // Extract author handle
  let authorHandle: string | null = null;
  const authorLink = postElement.querySelector('a[href*="/profile/"]');
  if (authorLink) {
    const handleMatch = (authorLink as HTMLAnchorElement).href.match(/\/profile\/([\w.]+)/);
    authorHandle = handleMatch ? handleMatch[1] : null;
  }

  // Extract author avatar
  const avatarElement =
    postElement.querySelector('img[alt*="avatar"]') || postElement.querySelector('img[src*="avatar"]');
  const authorAvatar = (avatarElement as HTMLImageElement)?.getAttribute('src');

  // Extract images and videos
  const imageElements = postElement.querySelectorAll('img[alt*="Image"]');
  const videoElements = postElement.querySelectorAll('video');

  const images = Array.from(imageElements)
    .map((img) => (img as HTMLImageElement).getAttribute('src'))
    .filter(Boolean) as string[];
  const videos = Array.from(videoElements) as HTMLVideoElement[];

  const thumbnailUrl = images.length > 0 ? images[0] : null;
  const hasVideo = videos.length > 0;

  // Extract timestamp
  const timeElement = postElement.querySelector('time') || postElement.querySelector('[datetime]');
  const timestamp = timeElement?.getAttribute('datetime') || (timeElement as HTMLElement)?.textContent;

  // Extract metrics
  const metricsElements = postElement.querySelectorAll(
    '[aria-label*="reply"], [aria-label*="repost"], [aria-label*="like"]'
  );
  const metrics: Record<string, string> = {};
  metricsElements.forEach((el) => {
    const label = el.getAttribute('aria-label');
    if (label) {
      if (label.includes('reply') || label.includes('replies')) {
        metrics.replies = label;
      } else if (label.includes('repost')) {
        metrics.reposts = label;
      } else if (label.includes('like')) {
        metrics.likes = label;
      }
    }
  });

  return {
    postId,
    postText,
    authorName,
    authorHandle,
    authorAvatar,
    thumbnailUrl,
    images,
    videos,
    hasVideo,
    url: postUrl,
    timestamp,
    metrics,
  };
}

// Inject the 530 button
async function injectButton(postElement: Element) {
  if (processedPosts.has(postElement)) return;
  processedPosts.add(postElement);

  const postId = getPostId(postElement);
  if (!postId) return;

  // Find actions container
  let actionsContainer: Element | null =
    postElement.querySelector('[role="group"]') ||
    postElement.querySelector('div[class*="PostDropdownBtn"]')?.parentElement ||
    postElement.querySelector('button[aria-label*="reply"]')?.parentElement?.parentElement;

  if (!actionsContainer) {
    const buttons = postElement.querySelectorAll('button[aria-label]');
    if (buttons.length >= 3) {
      let parent = buttons[0].parentElement;
      let depth = 0;
      while (parent && depth < 5) {
        const buttonsInParent = parent.querySelectorAll(':scope > * > button[aria-label]');
        if (buttonsInParent.length >= 3) {
          actionsContainer = parent;
          break;
        }
        parent = parent.parentElement;
        depth++;
      }
    }
  }

  if (!actionsContainer) {
    console.log('530: Actions container not found for Bluesky post', postId);
    return;
  }

  // Check if button already exists
  if (actionsContainer.querySelector(`.${CONFIG.containerClass}`)) {
    return;
  }

  // Extract post metadata
  const postData = extractPostMetadata(postElement);
  if (!postData) return;

  // Create button container
  const container = document.createElement('div');
  container.className = CONFIG.containerClass;
  container.style.cssText = 'display: inline-flex; align-items: center; margin-left: 8px;';

  // Create button
  const button = createButton(postId);
  button.className = CONFIG.buttonClass;
  button.style.borderRadius = '18px';
  button.style.padding = '6px 16px';
  button.style.fontSize = '13px';

  // Check post status
  const postStatus = await checkPostStatus(postId);
  const existingChannels = postStatus.exists && postStatus.content?.channels ? postStatus.content.channels : [];
  const existingPrimaryChannel =
    postStatus.exists && postStatus.content?.primary_channel ? postStatus.content.primary_channel : null;
  updateButtonAppearance(button, postStatus.exists, existingChannels.length);

  // Click handler
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('530: Bluesky button clicked!');

    // Build media assets
    const mediaAssets: any[] = [];
    for (const imageUrl of postData.images) {
      const imgElement = Array.from(postElement.querySelectorAll('img')).find(
        (img) => (img as HTMLImageElement).getAttribute('src') === imageUrl
      ) as HTMLImageElement | undefined;

      if (imgElement) {
        mediaAssets.push({
          type: 'image',
          url: imageUrl,
          width: imgElement.naturalWidth || imgElement.width || undefined,
          height: imgElement.naturalHeight || imgElement.height || undefined,
          mimeType: imageUrl.match(/\.(jpg|jpeg)$/i)
            ? 'image/jpeg'
            : imageUrl.match(/\.png$/i)
            ? 'image/png'
            : imageUrl.match(/\.gif$/i)
            ? 'image/gif'
            : imageUrl.match(/\.webp$/i)
            ? 'image/webp'
            : 'image/jpeg',
        });
      } else {
        mediaAssets.push({ type: 'image', url: imageUrl });
      }
    }

    if (postData.hasVideo && postData.videos.length > 0) {
      for (const videoElement of postData.videos) {
        const videoSrc = videoElement.src || videoElement.querySelector('source')?.src;
        if (videoSrc) {
          mediaAssets.push({
            type: 'video',
            url: videoSrc,
            width: videoElement.videoWidth || videoElement.width || undefined,
            height: videoElement.videoHeight || videoElement.height || undefined,
            duration:
              videoElement.duration && !isNaN(videoElement.duration) ? Math.round(videoElement.duration) : undefined,
            mimeType: 'video/mp4',
          });
        }
      }
    }

    const contentData = {
      platform: 'bluesky',
      platformContentId: postData.postId,
      url: postData.url,
      title: null,
      description: postData.postText,
      content: postData.postText,
      author: postData.authorName,
      authorUsername: postData.authorHandle,
      authorUrl: postData.authorHandle ? `https://bsky.app/profile/${postData.authorHandle}` : null,
      authorAvatarUrl: postData.authorAvatar,
      thumbnailUrl: postData.thumbnailUrl,
      mediaAssets: mediaAssets.length > 0 ? mediaAssets : undefined,
      contentCreatedAt: postData.timestamp,
      metadata: {
        metrics: postData.metrics,
        hasVideo: postData.hasVideo,
      },
    };

    // Show React popup
    showPopup(button, contentData, existingChannels, existingPrimaryChannel, (savedData) => {
      console.log('530: Channels saved for Bluesky post', savedData);
      const newChannelCount = savedData.channels ? savedData.channels.length : 0;
      updateButtonAppearance(button, true, newChannelCount);
      postStatusCache.set(postId, { exists: true, content: savedData });
    });
  });

  container.appendChild(button);
  actionsContainer.appendChild(container);
  console.log('530: Bluesky button injected for post', postId);
}

// Check if on single post page
function isSinglePostPage(): boolean {
  return window.location.pathname.includes('/post/');
}

// Observe and inject
function observePost() {
  if (!isSinglePostPage()) {
    console.log('530: Not a single post page, skipping');
    return;
  }

  let injectionAttempts = 0;
  const maxAttempts = 10;

  const tryInject = () => {
    injectionAttempts++;

    const actionButtons = document.querySelectorAll('button[aria-label*="reply"], button[aria-label*="Reply"]');

    if (actionButtons.length > 0) {
      const replyButton = actionButtons[0];
      let container = replyButton.parentElement;
      let depth = 0;

      while (container && depth < 10) {
        const buttonsInContainer = container.querySelectorAll('button[aria-label]');
        if (buttonsInContainer.length >= 3) {
          let postContainer: Element | null = container;
          while (postContainer && postContainer.tagName !== 'BODY') {
            const links = postContainer.querySelectorAll('a[href*="/post/"]');
            if (links.length > 0) {
              injectButton(postContainer);
              return true;
            }
            postContainer = postContainer.parentElement;
          }
          injectButton(container.parentElement || container);
          return true;
        }
        container = container.parentElement;
        depth++;
      }
    }

    if (injectionAttempts < maxAttempts) {
      setTimeout(tryInject, 500);
    }
    return false;
  };

  tryInject();

  // Throttled observer
  let lastInjection = 0;
  const observer = new MutationObserver(() => {
    const now = Date.now();
    if (now - lastInjection > 2000) {
      lastInjection = now;
      tryInject();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Initialize with retry logic
let initAttempts = 0;
const maxInitAttempts = 10;

function tryInitialize() {
  initAttempts++;

  const hasContent = document.querySelectorAll('div').length > 50 || document.querySelectorAll('button').length > 5;

  if (hasContent) {
    observePost();
  } else if (initAttempts < maxInitAttempts) {
    setTimeout(tryInitialize, 500);
  } else {
    observePost();
  }
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(tryInitialize, 1000);
  });
} else if (document.readyState === 'interactive') {
  setTimeout(tryInitialize, 1000);
} else {
  tryInitialize();
}

console.log('530 Extension: Bluesky React observation started');
