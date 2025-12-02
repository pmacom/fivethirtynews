// 530 Content Script - Bluesky Integration
console.log('530 Extension: Bluesky content script loaded');

// Configuration
const CONFIG = {
  buttonText: '530',
  buttonClass: 'five-thirty-button-bluesky',
  containerClass: 'five-thirty-container-bluesky'
};

// Track which posts already have buttons
const processedPosts = new WeakSet();
const postStatusCache = new Map();

// Extract post ID from URL or element
function getPostId(element) {
  // Try to get from URL first (format: /profile/{handle}/post/{postId})
  const urlMatch = window.location.href.match(/\/post\/([\w]+)/);
  if (urlMatch) return urlMatch[1];

  // Try to get from element's data attributes or links
  const linkElement = element.querySelector('a[href*="/post/"]');
  if (linkElement) {
    const match = linkElement.href.match(/\/post\/([\w]+)/);
    if (match) return match[1];
  }

  return null;
}

// Check if post exists in database
async function checkPostStatus(postId) {
  if (postStatusCache.has(postId)) {
    return postStatusCache.get(postId);
  }

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'checkContentExists',
      data: {
        platform: 'bluesky',
        contentId: postId
      }
    });

    const status = response.success ? response.data : { exists: false, content: null };
    postStatusCache.set(postId, status);
    return status;
  } catch (error) {
    console.error('530: Failed to check post status', error);
    return { exists: false, content: null };
  }
}

// Update button appearance based on post status
function updateButtonAppearance(button, exists, tagCount = 0) {
  if (exists) {
    button.textContent = `530 ✓`;
    button.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    button.setAttribute('data-tagged', 'true');
    button.setAttribute('title', `Tagged with ${tagCount} tag(s) - click to edit`);
  } else {
    button.textContent = CONFIG.buttonText;
    button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    button.setAttribute('data-tagged', 'false');
    button.setAttribute('title', 'Tag this post');
  }
}

// Extract post metadata from DOM
function extractPostMetadata(postElement) {
  const postId = getPostId(postElement);
  if (!postId) return null;

  // Extract post text
  const textElement = postElement.querySelector('[data-testid="postText"]') ||
                     postElement.querySelector('[class*="postText"]') ||
                     postElement.querySelector('div[dir="auto"]');
  const postText = textElement?.textContent?.trim();

  // Extract post URL
  const linkElement = postElement.querySelector('a[href*="/post/"]');
  const postUrl = linkElement?.href || window.location.href;

  // Extract author info
  const authorElement = postElement.querySelector('[data-testid="authorName"]') ||
                       postElement.querySelector('a[href*="/profile/"]');
  const authorName = authorElement?.textContent?.trim();

  // Extract author handle from URL
  let authorHandle = null;
  const authorLink = postElement.querySelector('a[href*="/profile/"]');
  if (authorLink) {
    const handleMatch = authorLink.href.match(/\/profile\/([\w\.]+)/);
    authorHandle = handleMatch ? handleMatch[1] : null;
  }

  // Extract author avatar
  const avatarElement = postElement.querySelector('img[alt*="avatar"]') ||
                       postElement.querySelector('img[src*="avatar"]');
  const authorAvatar = avatarElement?.getAttribute('src');

  // Extract images and videos
  const imageElements = postElement.querySelectorAll('img[alt*="Image"]');
  const videoElements = postElement.querySelectorAll('video');

  const images = Array.from(imageElements).map(img => img.getAttribute('src')).filter(Boolean);
  const videos = Array.from(videoElements);

  const thumbnailUrl = images.length > 0 ? images[0] : null;
  const hasVideo = videos.length > 0;

  // Extract timestamp
  const timeElement = postElement.querySelector('time') ||
                     postElement.querySelector('[datetime]');
  const timestamp = timeElement?.getAttribute('datetime') || timeElement?.textContent;

  // Extract engagement metrics
  const metricsElements = postElement.querySelectorAll('[aria-label*="reply"], [aria-label*="repost"], [aria-label*="like"]');
  const metrics = {};
  metricsElements.forEach(el => {
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

  console.log('530: Extracted Bluesky metadata:', {
    postId,
    text: postText?.substring(0, 50),
    author: authorName,
    handle: authorHandle,
    hasImage: !!thumbnailUrl
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
    metrics
  };
}

// Inject the 530 button into Bluesky post
async function injectButton(postElement) {
  // Skip if already processed
  if (processedPosts.has(postElement)) return;
  processedPosts.add(postElement);

  const postId = getPostId(postElement);
  if (!postId) {
    console.log('530: Could not extract post ID from Bluesky post');
    return;
  }

  console.log('530: Processing Bluesky post', postId);

  // Find the action buttons container (reply, repost, like, etc.)
  // Bluesky typically has buttons in a row at the bottom of the post
  let actionsContainer = postElement.querySelector('[role="group"]') ||
                        postElement.querySelector('div[class*="PostDropdownBtn"]')?.parentElement ||
                        postElement.querySelector('button[aria-label*="reply"]')?.parentElement?.parentElement;

  // Try finding any button group at the bottom
  if (!actionsContainer) {
    const buttons = postElement.querySelectorAll('button[aria-label]');
    if (buttons.length >= 3) {
      // Find common parent of multiple buttons
      const firstButton = buttons[0];
      let parent = firstButton.parentElement;
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

  console.log('530: Found actions container:', actionsContainer);

  // Check if button already exists
  if (actionsContainer.querySelector(`.${CONFIG.containerClass}`)) {
    console.log('530: Button already exists for post', postId);
    return;
  }

  // Extract post metadata
  const postData = extractPostMetadata(postElement);
  if (!postData) {
    console.error('530: Could not extract post metadata');
    return;
  }

  // Create button container
  const container = document.createElement('div');
  container.className = CONFIG.containerClass;
  container.style.cssText = 'display: inline-flex; align-items: center; margin-left: 8px;';

  // Create the 530 button
  const button = document.createElement('button');
  button.className = CONFIG.buttonClass;
  button.textContent = CONFIG.buttonText;
  button.setAttribute('data-post-id', postId);
  button.setAttribute('aria-label', 'Tag with 530');
  button.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 18px;
    padding: 6px 16px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  `;

  // Hover effects
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.05)';
    button.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = 'none';
  });

  // Check if post already exists
  const postStatus = await checkPostStatus(postId);
  const existingChannels = postStatus.exists && postStatus.content?.channels ? postStatus.content.channels : [];
  const existingPrimaryChannel = postStatus.exists && postStatus.content?.primary_channel ? postStatus.content.primary_channel : null;
  updateButtonAppearance(button, postStatus.exists, existingChannels.length);

  // Click handler - show tag modal
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Prepare content data with rich media assets
    const mediaAssets = [];

    // Add images with dimensions
    for (const imageUrl of postData.images) {
      const imgElement = Array.from(postElement.querySelectorAll('img'))
        .find(img => img.getAttribute('src') === imageUrl);

      if (imgElement) {
        mediaAssets.push({
          type: 'image',
          url: imageUrl,
          width: imgElement.naturalWidth || imgElement.width || undefined,
          height: imgElement.naturalHeight || imgElement.height || undefined,
          mimeType: imageUrl.match(/\.(jpg|jpeg)$/i) ? 'image/jpeg' :
                   imageUrl.match(/\.png$/i) ? 'image/png' :
                   imageUrl.match(/\.gif$/i) ? 'image/gif' :
                   imageUrl.match(/\.webp$/i) ? 'image/webp' : 'image/jpeg'
        });
      } else {
        mediaAssets.push({
          type: 'image',
          url: imageUrl
        });
      }
    }

    // Add videos with dimensions and duration
    if (postData.hasVideo && postData.videos.length > 0) {
      for (const videoElement of postData.videos) {
        const videoSrc = videoElement.src || videoElement.querySelector('source')?.src;
        if (videoSrc) {
          mediaAssets.push({
            type: 'video',
            url: videoSrc,
            width: videoElement.videoWidth || videoElement.width || undefined,
            height: videoElement.videoHeight || videoElement.height || undefined,
            duration: videoElement.duration && !isNaN(videoElement.duration) ?
                     Math.round(videoElement.duration) : undefined,
            mimeType: 'video/mp4'
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
        hasVideo: postData.hasVideo
      }
    };

    // Close any existing selector
    if (window.activeChannelSelector) {
      window.activeChannelSelector.close();
    }

    // Show channel selector
    if (window.ChannelSelector) {
      window.activeChannelSelector = new window.ChannelSelector({
        postData: contentData,
        existingChannels,
        existingPrimaryChannel,
        onSave: (savedData) => {
          console.log('530: Channels saved for Bluesky post', savedData);
          // Update button appearance
          const newChannelCount = savedData.channels ? savedData.channels.length : 0;
          updateButtonAppearance(button, true, newChannelCount);
          // Update cache
          postStatusCache.set(postId, { exists: true, content: savedData });
        },
        onCancel: () => {
          console.log('530: Channel selection cancelled');
          window.activeChannelSelector = null;
        }
      });

      window.activeChannelSelector.show(button);
    } else if (window.TagHierarchyModal) {
      // Fallback to old modal if ChannelSelector not loaded
      new window.TagHierarchyModal(
        contentData,
        existingChannels,
        (savedData) => {
          console.log('530: Tags saved (fallback)', savedData);
          const newTagCount = savedData.tags ? savedData.tags.length : 0;
          updateButtonAppearance(button, true, newTagCount);
          postStatusCache.set(postId, { exists: true, content: savedData });
        },
        () => {
          console.log('530: Tagging cancelled');
        }
      );
    } else {
      console.error('530: ChannelSelector not loaded');
      alert('Channel selector not available. Please reload the page.');
    }
  });

  container.appendChild(button);
  actionsContainer.appendChild(container);
  console.log('530: Bluesky button injected');
}

// Check if we're on a single post page
function isSinglePostPage() {
  // Single post URLs look like: /profile/{handle}/post/{postId}
  return window.location.pathname.includes('/post/');
}

// Observe DOM changes to inject button on single post page
function observePost() {
  console.log('530: Looking for Bluesky post...');
  console.log('530: Current URL:', window.location.href);

  // Only work on single post pages
  if (!isSinglePostPage()) {
    console.log('530: Not a single post page, skipping');
    return;
  }

  let injectionAttempts = 0;
  const maxAttempts = 10;

  const tryInject = () => {
    injectionAttempts++;

    // Look for the main post container with action buttons
    // On single post pages, there's typically one main post
    const actionButtons = document.querySelectorAll('button[aria-label*="reply"], button[aria-label*="Reply"]');

    if (actionButtons.length > 0) {
      console.log('530: Found', actionButtons.length, 'reply buttons');

      // Find the parent container of the first reply button
      const replyButton = actionButtons[0];
      let container = replyButton.parentElement;
      let depth = 0;

      // Walk up to find the actions container
      while (container && depth < 10) {
        const buttonsInContainer = container.querySelectorAll('button[aria-label]');
        // Action bar should have at least 3 buttons (reply, repost, like)
        if (buttonsInContainer.length >= 3) {
          console.log('530: Found actions container with', buttonsInContainer.length, 'buttons');

          // Find the specific post by looking for buttons in this container
          let postContainer = container;
          while (postContainer && postContainer.tagName !== 'BODY') {
            // Check if this container has the post URL in it
            const links = postContainer.querySelectorAll('a[href*="/post/"]');
            if (links.length > 0) {
              injectButton(postContainer);
              return true;
            }
            postContainer = postContainer.parentElement;
          }

          // Fallback: just use the current container
          injectButton(container.parentElement || container);
          return true;
        }
        container = container.parentElement;
        depth++;
      }
    }

    if (injectionAttempts < maxAttempts) {
      console.log('530: Retry injection attempt', injectionAttempts);
      setTimeout(tryInject, 500);
    } else {
      console.log('530: Max injection attempts reached');
    }
  };

  // Try immediate injection
  tryInject();

  // Also observe for changes (but throttled)
  let lastInjection = 0;
  const observer = new MutationObserver(() => {
    const now = Date.now();
    if (now - lastInjection > 2000) { // Only try every 2 seconds
      lastInjection = now;
      tryInject();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Initialize with retry logic for React app
let initAttempts = 0;
const maxAttempts = 10;

function tryInitialize() {
  initAttempts++;
  console.log(`530: Initialization attempt ${initAttempts}/${maxAttempts}`);

  // Check if content has loaded
  const hasContent = document.querySelectorAll('div').length > 50 ||
                    document.querySelectorAll('button').length > 5;

  if (hasContent) {
    console.log('530: Content detected, starting observation');
    observePost();
  } else if (initAttempts < maxAttempts) {
    console.log('530: Waiting for content to load...');
    setTimeout(tryInitialize, 500);
  } else {
    console.log('530: Max attempts reached, starting observation anyway');
    observePost();
  }
}

// Wait for page to be interactive or complete
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(tryInitialize, 1000);
  });
} else if (document.readyState === 'interactive') {
  // Wait a bit for React to render
  setTimeout(tryInitialize, 1000);
} else {
  // Page fully loaded
  tryInitialize();
}

console.log('530 Extension: Bluesky script initialized');
