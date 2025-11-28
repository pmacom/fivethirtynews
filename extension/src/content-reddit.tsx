// 530 Content Script - Reddit (React)
import { showPopup, updateButtonAppearance, createButton, isExtensionContextValid } from './shared/popup';

console.log('530 Extension: Reddit React content script loaded');

// Configuration
const CONFIG = {
  buttonClass: 'five-thirty-button-reddit',
  containerClass: 'five-thirty-container-reddit',
};

// Track which posts already have buttons
const processedPosts = new WeakSet<Element>();
const postStatusCache = new Map<string, { exists: boolean; content: any }>();

// Extract post ID from URL or element
function getPostId(element: Element): string | null {
  // Strategy 1: Try data attributes
  const dataId =
    element.getAttribute('data-fullname') ||
    element.getAttribute('data-post-id') ||
    element.getAttribute('id');

  if (dataId && dataId.startsWith('t3_')) {
    return dataId.replace('t3_', '');
  }

  // Strategy 2: Permalink attribute
  const permalink = element.getAttribute('permalink');
  if (permalink) {
    const match = permalink.match(/comments\/([\w]+)/);
    if (match) return match[1];
  }

  // Strategy 3: URL
  const urlMatch = window.location.href.match(/comments\/([\w]+)/);
  if (urlMatch) return urlMatch[1];

  // Strategy 4: Links in element
  const searchRoot = (element as any).shadowRoot || element;
  const linkElement =
    searchRoot.querySelector('a[href*="/comments/"]') || element.querySelector('a[href*="/comments/"]');

  if (linkElement) {
    const match = (linkElement as HTMLAnchorElement).href.match(/comments\/([\w]+)/);
    if (match) return match[1];
  }

  // Strategy 5: data-url attribute
  const dataUrl = element.getAttribute('data-url');
  if (dataUrl) {
    const match = dataUrl.match(/comments\/([\w]+)/);
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
      data: { platform: 'reddit', contentId: postId },
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

// Get high quality Reddit image URL
function getHighQualityRedditImageUrl(url: string): string {
  if (!url) return url;
  let enhanced = url.replace('preview.redd.it', 'i.redd.it');
  enhanced = enhanced.split('?')[0];
  enhanced = enhanced.replace(/&amp;/g, '&');
  return enhanced;
}

// Helper to search within shadow DOM
function querySelectorDeep(element: Element, selector: string): Element | null {
  let result = element.querySelector(selector);
  if (result) return result;

  const shadowRoot = (element as any).shadowRoot;
  if (shadowRoot) {
    result = shadowRoot.querySelector(selector);
    if (result) return result;
  }

  const children = shadowRoot ? shadowRoot.querySelectorAll('*') : element.querySelectorAll('*');

  for (const child of Array.from(children)) {
    const childShadow = (child as any).shadowRoot;
    if (childShadow) {
      result = childShadow.querySelector(selector);
      if (result) return result;
    }
  }

  return null;
}

// Extract post metadata from DOM
function extractPostMetadata(postElement: Element) {
  const postId = getPostId(postElement);
  if (!postId) return null;

  const searchRoot = (postElement as any).shadowRoot || postElement;

  // Extract title
  const titleElement =
    querySelectorDeep(postElement, 'h1') ||
    querySelectorDeep(postElement, '[slot="title"]') ||
    querySelectorDeep(postElement, '[data-test-id="post-content"] h3') ||
    querySelectorDeep(postElement, 'a[data-click-id="body"]') ||
    searchRoot.querySelector('h1, h2, h3');
  const title = (titleElement as HTMLElement)?.textContent?.trim();

  // Extract post URL
  const linkElement =
    querySelectorDeep(postElement, 'a[slot="full-post-link"]') ||
    querySelectorDeep(postElement, 'a[data-click-id="body"]') ||
    querySelectorDeep(postElement, 'a[href*="/comments/"]') ||
    searchRoot.querySelector('a[href*="/comments/"]');
  const postUrl = (linkElement as HTMLAnchorElement)?.href || window.location.href;

  // Extract content
  const contentElement =
    querySelectorDeep(postElement, '[slot="text-body"]') ||
    querySelectorDeep(postElement, 'div[slot="post-body"]') ||
    querySelectorDeep(postElement, '[data-test-id="post-content"] > div:last-child') ||
    querySelectorDeep(postElement, '.usertext-body') ||
    searchRoot.querySelector('[data-click-id="text"]');
  const content = (contentElement as HTMLElement)?.textContent?.trim();

  // Extract author
  const authorElement =
    querySelectorDeep(postElement, '[slot="author"]') ||
    querySelectorDeep(postElement, 'a[slot="author-link"]') ||
    querySelectorDeep(postElement, '[data-testid="post_author_link"]') ||
    querySelectorDeep(postElement, 'a[href*="/user/"]') ||
    searchRoot.querySelector('a[href*="/user/"]');
  const authorText = (authorElement as HTMLElement)?.textContent?.trim() || '';
  const author = authorText.replace(/^u\//, '');
  const authorUsername = author;
  const authorUrl = (authorElement as HTMLAnchorElement)?.getAttribute('href');
  const authorFullUrl = authorUrl ? (authorUrl.startsWith('http') ? authorUrl : `https://www.reddit.com${authorUrl}`) : null;

  // Extract author avatar
  const authorAvatarElement =
    querySelectorDeep(postElement, 'img[alt*="avatar"]') || searchRoot.querySelector('img[src*="avatar"]');
  const authorAvatarUrl = (authorAvatarElement as HTMLImageElement)?.src || null;

  // Extract subreddit
  const subredditElement =
    querySelectorDeep(postElement, '[slot="subreddit"]') ||
    querySelectorDeep(postElement, 'a[slot="subreddit-link"]') ||
    querySelectorDeep(postElement, '[data-click-id="subreddit"]') ||
    querySelectorDeep(postElement, 'a[href*="/r/"]') ||
    searchRoot.querySelector('a[href*="/r/"]');
  let subreddit = (subredditElement as HTMLElement)?.textContent?.trim()?.replace(/^r\//, '');
  if (!subreddit) {
    const urlMatch = postUrl.match(/\/r\/([\w]+)\//);
    subreddit = urlMatch ? urlMatch[1] : undefined;
  }

  // Extract images
  const imageElements: HTMLImageElement[] = [];
  const thumbnailImage = querySelectorDeep(postElement, '[slot="thumbnail"]') || querySelectorDeep(postElement, 'img[alt="Post image"]');
  if (thumbnailImage) imageElements.push(thumbnailImage as HTMLImageElement);

  const galleryImages = Array.from(
    querySelectorDeep(postElement, '[data-test-id="post-content"]')?.querySelectorAll('img') || []
  ) as HTMLImageElement[];
  imageElements.push(...galleryImages);

  const redditImages = Array.from(
    searchRoot.querySelectorAll('img[src*="redd.it"], img[src*="reddit.com"]')
  ) as HTMLImageElement[];
  imageElements.push(...redditImages);

  // Extract videos
  const videoElements: HTMLVideoElement[] = [];
  const videoElement = querySelectorDeep(postElement, 'video') || searchRoot.querySelector('video');
  if (videoElement) videoElements.push(videoElement as HTMLVideoElement);

  // Get unique image URLs
  const rawImages = [...new Set(imageElements.map((img) => img?.getAttribute('src')).filter(Boolean))] as string[];
  const images = rawImages.map((url) => getHighQualityRedditImageUrl(url));
  const thumbnailUrl = images.length > 0 ? images[0] : null;

  const isVideo =
    videoElements.length > 0 ||
    !!postElement.querySelector('[class*="is-video"]') ||
    !!postElement.querySelector('[data-is-video="true"]');

  // Extract score
  const scoreElement =
    querySelectorDeep(postElement, '[slot="up-vote"]') ||
    querySelectorDeep(postElement, '[id*="vote-arrows"]') ||
    querySelectorDeep(postElement, '.score') ||
    searchRoot.querySelector('[aria-label*="upvote"]');
  const scoreText = (scoreElement as HTMLElement)?.textContent?.trim() || scoreElement?.getAttribute('aria-label');

  // Extract comment count
  const commentsElement =
    querySelectorDeep(postElement, '[slot="comment-count"]') ||
    querySelectorDeep(postElement, '[data-click-id="comments"]') ||
    searchRoot.querySelector('[aria-label*="comment"]');
  const commentsText = (commentsElement as HTMLElement)?.textContent?.trim() || commentsElement?.getAttribute('aria-label');

  return {
    postId,
    title,
    content,
    author,
    authorUsername,
    authorUrl: authorFullUrl,
    authorAvatarUrl,
    subreddit,
    thumbnailUrl,
    images,
    videoElements,
    isVideo,
    url: postUrl,
    scoreText,
    commentsText,
  };
}

// Find actions container in shadow DOM
function findActionsContainerInShadow(postElement: Element): Element | null {
  const shadowRoot = (postElement as any).shadowRoot;
  if (!shadowRoot) return null;

  // Strategy 1: Find via comments button
  const buttons = shadowRoot.querySelectorAll('button, a[role="button"]');
  for (const button of Array.from(buttons)) {
    const text = (button as HTMLElement).textContent?.trim().toLowerCase();
    const ariaLabel = button.getAttribute('aria-label')?.toLowerCase();
    if (text && (text.includes('comment') || ariaLabel?.includes('comment'))) {
      return (button as HTMLElement).parentElement;
    }
  }

  // Strategy 2: Look for button groups
  const divs = shadowRoot.querySelectorAll('div');
  for (const div of Array.from(divs)) {
    const buttonsInDiv = div.querySelectorAll(':scope > button, :scope > a[role="button"], :scope > div > button');
    if (buttonsInDiv.length >= 2) {
      const hasActionButton = Array.from(buttonsInDiv).some((btn) => {
        const text = (btn as HTMLElement).textContent?.toLowerCase() || '';
        const label = btn.getAttribute('aria-label')?.toLowerCase() || '';
        return text.includes('comment') || text.includes('share') || label.includes('comment') || label.includes('share');
      });
      if (hasActionButton) return div;
    }
  }

  // Strategy 3: Slot/id attributes
  return (
    shadowRoot.querySelector('[slot="actionRow"]') ||
    shadowRoot.querySelector('[slot*="action"]') ||
    shadowRoot.querySelector('[id*="action-row"]') ||
    shadowRoot.querySelector('[id*="bottom-bar"]')
  );
}

// Inject the 530 button
async function injectButton(postElement: Element) {
  if (processedPosts.has(postElement)) return;
  processedPosts.add(postElement);

  const postId = getPostId(postElement);
  if (!postId) return;

  const searchRoot = (postElement as any).shadowRoot || postElement;

  // Find actions container
  let actionsContainer: Element | null = null;

  if ((postElement as any).shadowRoot) {
    actionsContainer = findActionsContainerInShadow(postElement);
  }

  if (!actionsContainer) {
    actionsContainer =
      querySelectorDeep(postElement, '[slot="actionRow"]') ||
      querySelectorDeep(postElement, 'shreddit-comment-action-row') ||
      querySelectorDeep(postElement, '[id*="action-row"]') ||
      querySelectorDeep(postElement, 'div[slot="bottom-meta"]') ||
      searchRoot.querySelector('[data-click-id="comments"]')?.parentElement ||
      searchRoot.querySelector('[data-test-id="post-content"] footer') ||
      searchRoot.querySelector('.buttons') ||
      searchRoot.querySelector('.flat-list.buttons') ||
      searchRoot.querySelector('ul.flat-list') ||
      searchRoot.querySelector('[aria-label*="share"]')?.parentElement ||
      searchRoot.querySelector('[aria-label*="Share"]')?.parentElement ||
      searchRoot.querySelector('.entry .flat-list');
  }

  if (!actionsContainer) {
    // Create fallback container
    const fallbackContainer = document.createElement('div');
    fallbackContainer.style.cssText = 'padding: 8px 12px; display: flex; gap: 8px;';
    if ((postElement as any).shadowRoot) {
      (postElement as any).shadowRoot.appendChild(fallbackContainer);
    } else {
      postElement.appendChild(fallbackContainer);
    }
    actionsContainer = fallbackContainer;
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
  button.style.borderRadius = '16px';
  button.style.padding = '6px 16px';
  button.style.fontSize = '12px';

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

    console.log('530: Reddit button clicked!');

    // Build media assets
    const mediaAssets: any[] = [];
    for (const imageUrl of postData.images) {
      mediaAssets.push({
        type: 'image',
        url: imageUrl,
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
    }

    if (postData.isVideo && postData.videoElements.length > 0) {
      for (const videoElement of postData.videoElements) {
        const videoSrc = videoElement.src || videoElement.querySelector('source')?.src;
        if (videoSrc) {
          mediaAssets.push({
            type: 'video',
            url: videoSrc,
            width: videoElement.videoWidth || videoElement.width || undefined,
            height: videoElement.videoHeight || videoElement.height || undefined,
            duration: videoElement.duration && !isNaN(videoElement.duration) ? Math.round(videoElement.duration) : undefined,
            mimeType: videoSrc.match(/\.webm$/i) ? 'video/webm' : 'video/mp4',
          });
        }
      }
    }

    const contentData = {
      platform: 'reddit',
      platformContentId: postData.postId,
      url: postData.url,
      title: postData.title,
      description: postData.content,
      author: postData.author,
      authorUsername: postData.authorUsername,
      authorUrl: postData.authorUrl,
      authorAvatarUrl: postData.authorAvatarUrl,
      thumbnailUrl: postData.thumbnailUrl,
      mediaAssets: mediaAssets.length > 0 ? mediaAssets : undefined,
      metadata: {
        subreddit: postData.subreddit,
        scoreText: postData.scoreText,
        commentsText: postData.commentsText,
        isVideo: postData.isVideo,
      },
    };

    // Show React popup
    showPopup(button, contentData, existingChannels, existingPrimaryChannel, (savedData) => {
      console.log('530: Channels saved for Reddit post', savedData);
      const newChannelCount = savedData.channels ? savedData.channels.length : 0;
      updateButtonAppearance(button, true, newChannelCount);
      postStatusCache.set(postId, { exists: true, content: savedData });
    });
  });

  container.appendChild(button);
  actionsContainer.appendChild(container);
  console.log('530: Reddit button injected for post', postId);
}

// Process all visible posts
function processAllPosts() {
  const shredditPosts = document.querySelectorAll('shreddit-post');
  const oldRedditPosts = document.querySelectorAll('.thing.link');
  const otherPosts = document.querySelectorAll('.Post, [data-testid="post-container"]');

  const allPosts = new Set([...Array.from(shredditPosts), ...Array.from(oldRedditPosts), ...Array.from(otherPosts)]);

  allPosts.forEach((post) => {
    injectButton(post);
  });

  // Single post page
  const singlePost = document.querySelector('[data-test-id="post-content"]');
  if (singlePost && !processedPosts.has(singlePost)) {
    injectButton(singlePost);
  }
}

// Debounced mutation handler
let mutationTimeout: ReturnType<typeof setTimeout> | null = null;
function handleMutations() {
  if (mutationTimeout) {
    clearTimeout(mutationTimeout);
  }
  mutationTimeout = setTimeout(() => {
    processAllPosts();
  }, 100);
}

// Observe posts
function observePosts() {
  processAllPosts();

  const observer = new MutationObserver(handleMutations);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // URL change detection
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      postStatusCache.clear();
      setTimeout(processAllPosts, 500);
    }
  }).observe(document.querySelector('head > title')!, {
    subtree: true,
    characterData: true,
    childList: true,
  });

  // Periodic rescan
  setInterval(() => {
    processAllPosts();
  }, 3000);
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observePosts);
} else {
  observePosts();
}

console.log('530 Extension: Reddit React observation started');
