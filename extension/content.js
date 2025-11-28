// 530 Content Script - Injects tag button on X.com posts
console.log('530 Extension: Content script loaded');

// Configuration
const CONFIG = {
  buttonText: '530',
  buttonClass: 'five-thirty-button',
  containerClass: 'five-thirty-container'
};

// Helper: Extract media dimensions and metadata
async function extractMediaAsset(element) {
  if (!element) return null;

  const tagName = element.tagName.toLowerCase();

  if (tagName === 'img') {
    // Wait for image to load if needed
    if (!element.complete) {
      await new Promise((resolve) => {
        element.onload = resolve;
        element.onerror = resolve;
        setTimeout(resolve, 1000); // Timeout after 1s
      });
    }

    return {
      type: 'image',
      url: element.src,
      width: element.naturalWidth || element.width || undefined,
      height: element.naturalHeight || element.height || undefined,
      mimeType: element.src.match(/\.(jpg|jpeg)$/i) ? 'image/jpeg' :
                element.src.match(/\.png$/i) ? 'image/png' :
                element.src.match(/\.gif$/i) ? 'image/gif' :
                element.src.match(/\.webp$/i) ? 'image/webp' : 'image/jpeg'
    };
  } else if (tagName === 'video') {
    return {
      type: 'video',
      url: element.src || element.querySelector('source')?.src,
      width: element.videoWidth || element.width || undefined,
      height: element.videoHeight || element.height || undefined,
      duration: element.duration && !isNaN(element.duration) ? Math.round(element.duration) : undefined,
      mimeType: 'video/mp4'
    };
  }

  return null;
}

// Track which posts already have buttons
const processedPosts = new WeakSet();
const postStatusCache = new Map();

// Check if post exists in database
async function checkPostStatus(tweetId) {
  if (postStatusCache.has(tweetId)) {
    return postStatusCache.get(tweetId);
  }

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'checkPostExists',
      data: { tweetId }
    });

    const status = response.success ? response.data : { exists: false, post: null };
    postStatusCache.set(tweetId, status);
    return status;
  } catch (error) {
    console.error('530: Failed to check post status', error);
    return { exists: false, post: null };
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

// Inject the 530 button into X.com post action bars
async function injectButton(article) {
  // Skip if already processed
  if (processedPosts.has(article)) return;
  processedPosts.add(article);

  // Find the action bar (contains like, retweet, reply buttons)
  const actionBar = article.querySelector('[role="group"]');
  if (!actionBar) return;

  // Get tweet data
  const tweetLink = article.querySelector('a[href*="/status/"]');
  if (!tweetLink) return;

  const tweetId = tweetLink.href.match(/status\/(\d+)/)?.[1];
  if (!tweetId) return;

  // Get tweet text
  const tweetTextElement = article.querySelector('[data-testid="tweetText"]');
  const tweetText = tweetTextElement ? tweetTextElement.textContent : '';

  // Get author information
  const authorElement = article.querySelector('[data-testid="User-Name"]');

  // Extract display name (first span in User-Name)
  const displayNameSpan = authorElement?.querySelector('span > span');
  const author = displayNameSpan ? displayNameSpan.textContent : '';

  // Extract username (link or text containing @)
  const usernameLink = authorElement?.querySelector('a[role="link"]');
  const usernameText = usernameLink ? usernameLink.textContent : '';
  const authorUsername = usernameText.replace('@', ''); // Remove @ symbol

  // Extract author profile URL
  const authorUrl = usernameLink ? usernameLink.href : '';

  // Extract author avatar
  const avatarImg = article.querySelector('[data-testid="Tweet-User-Avatar"] img');
  const authorAvatarUrl = avatarImg ? avatarImg.src : '';

  // Get all media in the tweet (images and videos)
  const imageElements = article.querySelectorAll('[data-testid="tweetPhoto"] img, [data-testid="card.layoutLarge.media"] img');
  const videoElements = article.querySelectorAll('video');

  // Collect all media elements
  const allMediaElements = [...imageElements, ...videoElements];

  // For backwards compatibility, keep first image URL
  const firstImage = imageElements[0];
  const thumbnailUrl = firstImage ? firstImage.src : null;

  // Create button container
  const container = document.createElement('div');
  container.className = CONFIG.containerClass;
  container.style.cssText = 'display: inline-flex; align-items: center;';

  // Create the 530 button
  const button = document.createElement('button');
  button.className = CONFIG.buttonClass;
  button.textContent = CONFIG.buttonText;
  button.setAttribute('data-tweet-id', tweetId);
  button.setAttribute('aria-label', 'Tag with 530');
  button.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 20px;
    padding: 6px 16px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-left: 8px;
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
  const postStatus = await checkPostStatus(tweetId);
  const existingChannels = postStatus.exists && postStatus.post?.channels ? postStatus.post.channels : [];
  const existingPrimaryChannel = postStatus.exists && postStatus.post?.primary_channel ? postStatus.post.primary_channel : null;
  updateButtonAppearance(button, postStatus.exists, existingChannels.length);

  // Click handler - show channel selector
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('530: Button clicked!');
    console.log('530: ChannelSelector available:', !!window.ChannelSelector);
    console.log('530: SmartPopover available:', !!window.SmartPopover);

    // Close any existing selector
    if (window.activeChannelSelector) {
      window.activeChannelSelector.close();
    }

    // Extract rich media assets with dimensions
    const mediaAssets = [];
    for (const element of allMediaElements) {
      const asset = await extractMediaAsset(element);
      if (asset && asset.url) {
        mediaAssets.push(asset);
      }
    }

    // Prepare post data
    const postData = {
      platform: 'twitter',
      platformContentId: tweetId,
      tweetId,
      tweetText,
      content: tweetText,
      author,
      authorUsername,
      authorUrl,
      authorAvatarUrl,
      url: tweetLink.href,
      thumbnailUrl,
      mediaAssets: mediaAssets.length > 0 ? mediaAssets : undefined,
      timestamp: new Date().toISOString()
    };

    // Show channel selector
    if (window.ChannelSelector) {
      console.log('530: Creating ChannelSelector with postData:', postData);
      try {
        window.activeChannelSelector = new window.ChannelSelector({
          postData,
          existingChannels,
          existingPrimaryChannel,
          onSave: (savedData) => {
            console.log('530: Channels saved', savedData);
            // Update button appearance
            const newChannelCount = savedData.channels ? savedData.channels.length : 0;
            updateButtonAppearance(button, true, newChannelCount);
            // Update cache
            postStatusCache.set(tweetId, { exists: true, post: savedData });
          },
          onCancel: () => {
            console.log('530: Channel selection cancelled');
            window.activeChannelSelector = null;
          }
        });

        console.log('530: ChannelSelector created, calling show()');
        window.activeChannelSelector.show(button);
        console.log('530: show() called');
      } catch (error) {
        console.error('530: Error creating/showing ChannelSelector:', error);
      }
    } else if (window.TagHierarchyModal) {
      // Fallback to old modal if ChannelSelector not loaded
      new window.TagHierarchyModal(
        postData,
        existingChannels,
        (savedData) => {
          console.log('530: Tags saved (fallback)', savedData);
          const newTagCount = savedData.tags ? savedData.tags.length : 0;
          updateButtonAppearance(button, true, newTagCount);
          postStatusCache.set(tweetId, { exists: true, post: savedData });
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
  actionBar.appendChild(container);
}

// Observe DOM changes to inject buttons on new posts
function observePosts() {
  const observer = new MutationObserver((mutations) => {
    // Find all tweet articles
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    articles.forEach(article => {
      injectButton(article);
    });
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Initial injection for already-loaded posts
  const articles = document.querySelectorAll('article[data-testid="tweet"]');
  articles.forEach(article => {
    injectButton(article);
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observePosts);
} else {
  observePosts();
}

console.log('530 Extension: Observation started');
