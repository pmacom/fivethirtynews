// 530 Content Script - Reddit Integration
console.log('530 Extension: Reddit content script loaded');

// Configuration
const CONFIG = {
  buttonText: '530',
  buttonClass: 'five-thirty-button-reddit',
  containerClass: 'five-thirty-container-reddit'
};

// Track which posts already have buttons
const processedPosts = new WeakSet();
const postStatusCache = new Map();

// Extract post ID from URL or element
function getPostId(element) {
  // Strategy 1: Try to get from element's data attributes (old Reddit)
  const dataId = element.getAttribute('data-fullname') ||
                element.getAttribute('data-post-id') ||
                element.getAttribute('id');

  if (dataId && dataId.startsWith('t3_')) {
    return dataId.replace('t3_', '');
  }

  // Strategy 2: Try to get from permalink attribute (new Reddit)
  const permalink = element.getAttribute('permalink');
  if (permalink) {
    const match = permalink.match(/comments\/([\w]+)/);
    if (match) return match[1];
  }

  // Strategy 3: Try to get from URL if on single post page
  const urlMatch = window.location.href.match(/comments\/([\w]+)/);
  if (urlMatch) return urlMatch[1];

  // Strategy 4: Try to get from element's links (both shadow DOM and regular)
  const searchRoot = element.shadowRoot || element;
  const linkElement = searchRoot.querySelector('a[href*="/comments/"]') ||
                     element.querySelector('a[href*="/comments/"]');

  if (linkElement) {
    const match = linkElement.href.match(/comments\/([\w]+)/);
    if (match) return match[1];
  }

  // Strategy 5: For old Reddit, try data-url attribute
  const dataUrl = element.getAttribute('data-url');
  if (dataUrl) {
    const match = dataUrl.match(/comments\/([\w]+)/);
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
        platform: 'reddit',
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

// Helper function to get highest quality Reddit image URL
function getHighQualityRedditImageUrl(url) {
  if (!url) return url;

  // Convert preview.redd.it to i.redd.it for better quality
  let enhanced = url.replace('preview.redd.it', 'i.redd.it');

  // Remove quality-limiting query parameters
  enhanced = enhanced.split('?')[0];

  // For preview URLs, try to get the original size
  // Reddit preview URLs often have size parameters we can remove
  enhanced = enhanced.replace(/&amp;/g, '&');

  return enhanced;
}

// Extract post metadata from DOM
function extractPostMetadata(postElement) {
  const postId = getPostId(postElement);
  if (!postId) return null;

  // Use shadow DOM aware search
  const searchRoot = postElement.shadowRoot || postElement;

  // Extract title
  const titleElement = querySelectorDeep(postElement, 'h1') ||
                      querySelectorDeep(postElement, '[slot="title"]') ||
                      querySelectorDeep(postElement, '[data-test-id="post-content"] h3') ||
                      querySelectorDeep(postElement, 'a[data-click-id="body"]') ||
                      searchRoot.querySelector('h1, h2, h3');
  const title = titleElement?.textContent?.trim();

  // Extract post URL
  const linkElement = querySelectorDeep(postElement, 'a[slot="full-post-link"]') ||
                     querySelectorDeep(postElement, 'a[data-click-id="body"]') ||
                     querySelectorDeep(postElement, 'a[href*="/comments/"]') ||
                     searchRoot.querySelector('a[href*="/comments/"]');
  const postUrl = linkElement?.href || window.location.href;

  // Extract content/selftext
  const contentElement = querySelectorDeep(postElement, '[slot="text-body"]') ||
                        querySelectorDeep(postElement, 'div[slot="post-body"]') ||
                        querySelectorDeep(postElement, '[data-test-id="post-content"] > div:last-child') ||
                        querySelectorDeep(postElement, '.usertext-body') ||
                        searchRoot.querySelector('[data-click-id="text"]');
  const content = contentElement?.textContent?.trim();

  // Extract author with username
  const authorElement = querySelectorDeep(postElement, '[slot="author"]') ||
                       querySelectorDeep(postElement, 'a[slot="author-link"]') ||
                       querySelectorDeep(postElement, '[data-testid="post_author_link"]') ||
                       querySelectorDeep(postElement, 'a[href*="/user/"]') ||
                       searchRoot.querySelector('a[href*="/user/"]');
  const authorText = authorElement?.textContent?.trim() || '';
  const author = authorText.replace(/^u\//, '');
  const authorUsername = author; // Keep username separate
  const authorUrl = authorElement?.getAttribute('href');
  const authorFullUrl = authorUrl ? (authorUrl.startsWith('http') ? authorUrl : `https://www.reddit.com${authorUrl}`) : null;

  // Extract author avatar (if available)
  const authorAvatarElement = querySelectorDeep(postElement, 'img[alt*="avatar"]') ||
                              searchRoot.querySelector('img[src*="avatar"]');
  const authorAvatarUrl = authorAvatarElement?.src || null;

  // Extract subreddit
  const subredditElement = querySelectorDeep(postElement, '[slot="subreddit"]') ||
                          querySelectorDeep(postElement, 'a[slot="subreddit-link"]') ||
                          querySelectorDeep(postElement, '[data-click-id="subreddit"]') ||
                          querySelectorDeep(postElement, 'a[href*="/r/"]') ||
                          searchRoot.querySelector('a[href*="/r/"]');
  let subreddit = subredditElement?.textContent?.trim()?.replace(/^r\//, '');
  if (!subreddit) {
    const urlMatch = postUrl.match(/\/r\/([\w]+)\//);
    subreddit = urlMatch ? urlMatch[1] : null;
  }

  // Extract all media (Reddit supports gallery posts with multiple images and videos)
  const imageElements = [];
  const videoElements = [];

  // Try to find images in various locations
  const thumbnailImage = querySelectorDeep(postElement, '[slot="thumbnail"]') ||
                        querySelectorDeep(postElement, 'img[alt="Post image"]');
  if (thumbnailImage) imageElements.push(thumbnailImage);

  // Gallery images (prioritize high quality)
  const galleryImages = Array.from(querySelectorDeep(postElement, '[data-test-id="post-content"]')?.querySelectorAll('img') || []);
  imageElements.push(...galleryImages);

  // Fallback to any Reddit-hosted images
  const redditImages = Array.from(searchRoot.querySelectorAll('img[src*="redd.it"], img[src*="reddit.com"]'));
  imageElements.push(...redditImages);

  // Check for video elements (including v.redd.it hosted videos)
  const videoElement = querySelectorDeep(postElement, 'video') ||
                      searchRoot.querySelector('video');
  if (videoElement) videoElements.push(videoElement);

  // Check for v.redd.it links (Reddit-hosted video URLs in data attributes)
  const vRedditVideoUrl = postElement.getAttribute('data-permalink') ||
                          postElement.getAttribute('data-url');
  if (vRedditVideoUrl && vRedditVideoUrl.includes('v.redd.it')) {
    // Store the Reddit video URL for later extraction
    console.log('530: Found v.redd.it video URL:', vRedditVideoUrl);
  }

  // Get unique image URLs and enhance quality
  const rawImages = [...new Set(imageElements.map(img => img?.getAttribute('src')).filter(Boolean))];
  const images = rawImages.map(url => getHighQualityRedditImageUrl(url));
  const thumbnailUrl = images.length > 0 ? images[0] : null;

  // Check if this is a video post
  const isVideo = videoElements.length > 0 ||
                 postElement.querySelector('[class*="is-video"]') ||
                 postElement.querySelector('[data-is-video="true"]');

  // Extract score
  const scoreElement = querySelectorDeep(postElement, '[slot="up-vote"]') ||
                      querySelectorDeep(postElement, '[id*="vote-arrows"]') ||
                      querySelectorDeep(postElement, '.score') ||
                      searchRoot.querySelector('[aria-label*="upvote"]');
  const scoreText = scoreElement?.textContent?.trim() || scoreElement?.getAttribute('aria-label');

  // Extract comment count
  const commentsElement = querySelectorDeep(postElement, '[slot="comment-count"]') ||
                         querySelectorDeep(postElement, '[data-click-id="comments"]') ||
                         searchRoot.querySelector('[aria-label*="comment"]');
  const commentsText = commentsElement?.textContent?.trim() || commentsElement?.getAttribute('aria-label');

  console.log('530: Extracted metadata:', {
    postId,
    title: title?.substring(0, 50),
    author,
    authorUsername,
    subreddit,
    hasThumbnail: !!thumbnailUrl,
    imageCount: images.length,
    videoCount: videoElements.length
  });

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
    commentsText
  };
}

// Helper to search within shadow DOM
function querySelectorDeep(element, selector) {
  // Try normal querySelector first
  let result = element.querySelector(selector);
  if (result) return result;

  // If element has shadow root, search within it
  if (element.shadowRoot) {
    result = element.shadowRoot.querySelector(selector);
    if (result) return result;
  }

  // Search recursively in shadow DOMs of children
  const children = element.shadowRoot ?
    element.shadowRoot.querySelectorAll('*') :
    element.querySelectorAll('*');

  for (const child of children) {
    if (child.shadowRoot) {
      result = child.shadowRoot.querySelector(selector);
      if (result) return result;
    }
  }

  return null;
}

// Inject the 530 button into Reddit post
async function injectButton(postElement) {
  // Skip if already processed
  if (processedPosts.has(postElement)) return;
  processedPosts.add(postElement);

  const postId = getPostId(postElement);
  if (!postId) {
    console.log('530: Could not extract post ID');
    return;
  }

  console.log('530: Processing Reddit post', postId);

  // Determine if we need to access shadow DOM
  const searchRoot = postElement.shadowRoot || postElement;

  // Find the action buttons container (share, save, etc.)
  // Try multiple selectors for different Reddit layouts
  let actionsContainer = null;

  // For shadow DOM posts (new Reddit/Shreddit), find the comments button and use its parent
  if (postElement.shadowRoot) {
    // Strategy 1: Find the bottom action row by looking for common action buttons
    const buttons = postElement.shadowRoot.querySelectorAll('button, a[role="button"]');
    for (const button of buttons) {
      const text = button.textContent?.trim().toLowerCase();
      const ariaLabel = button.getAttribute('aria-label')?.toLowerCase();

      // Look for comment, share, save buttons
      if (text && (text.includes('comment') || ariaLabel?.includes('comment'))) {
        actionsContainer = button.parentElement;
        console.log('530: Found actions container via comments button in shadow DOM');
        break;
      }
    }

    // Strategy 2: Look for containers with multiple action buttons
    if (!actionsContainer) {
      const divs = postElement.shadowRoot.querySelectorAll('div');
      for (const div of divs) {
        const buttonsInDiv = div.querySelectorAll(':scope > button, :scope > a[role="button"], :scope > div > button');
        // Look for containers with 2+ buttons (typically upvote/comment/share/save)
        if (buttonsInDiv.length >= 2) {
          // Verify these are action buttons by checking for common patterns
          const hasActionButton = Array.from(buttonsInDiv).some(btn => {
            const text = btn.textContent?.toLowerCase() || '';
            const label = btn.getAttribute('aria-label')?.toLowerCase() || '';
            return text.includes('comment') || text.includes('share') ||
                   label.includes('comment') || label.includes('share');
          });

          if (hasActionButton) {
            actionsContainer = div;
            console.log('530: Found actions container via button group in shadow DOM');
            break;
          }
        }
      }
    }

    // Strategy 3: Look for specific slot or id attributes
    if (!actionsContainer) {
      actionsContainer =
        postElement.shadowRoot.querySelector('[slot="actionRow"]') ||
        postElement.shadowRoot.querySelector('[slot*="action"]') ||
        postElement.shadowRoot.querySelector('[id*="action-row"]') ||
        postElement.shadowRoot.querySelector('[id*="bottom-bar"]');

      if (actionsContainer) {
        console.log('530: Found actions container via slot/id in shadow DOM');
      }
    }
  }

  // Fallback to original selectors for non-shadow DOM posts (old Reddit, etc.)
  if (!actionsContainer) {
    actionsContainer =
      // New Reddit (Shreddit) - inside shadow DOM
      querySelectorDeep(postElement, '[slot="actionRow"]') ||
      querySelectorDeep(postElement, 'shreddit-comment-action-row') ||
      querySelectorDeep(postElement, '[id*="action-row"]') ||
      querySelectorDeep(postElement, 'div[slot="bottom-meta"]') ||
      // New Reddit - regular DOM
      searchRoot.querySelector('[data-click-id="comments"]')?.parentElement ||
      searchRoot.querySelector('[data-test-id="post-content"] footer') ||
      // Old Reddit selectors
      searchRoot.querySelector('.buttons') ||
      searchRoot.querySelector('.flat-list.buttons') ||
      searchRoot.querySelector('ul.flat-list') ||
      // Try finding share button and use its parent
      searchRoot.querySelector('[aria-label*="share"]')?.parentElement ||
      searchRoot.querySelector('[aria-label*="Share"]')?.parentElement ||
      // Fallback: look for any container with multiple links/buttons
      searchRoot.querySelector('.entry .flat-list');

    if (actionsContainer) {
      console.log('530: Found actions container in regular DOM');
    }
  }

  if (!actionsContainer) {
    console.warn('530: Actions container not found for Reddit post', postId);
    console.log('530: Post element:', postElement.tagName, 'Has shadowRoot:', !!postElement.shadowRoot);

    // Debug: List all elements in shadow root
    if (postElement.shadowRoot) {
      const shadowElements = Array.from(postElement.shadowRoot.querySelectorAll('*'));
      console.log('530: Shadow DOM elements:', shadowElements.map(el => el.tagName).slice(0, 20));
      console.log('530: Elements with slot attr:', shadowElements.filter(el => el.hasAttribute('slot')).map(el => `${el.tagName}[slot="${el.getAttribute('slot')}"]`));

      // Try to find any button-like elements
      const buttons = postElement.shadowRoot.querySelectorAll('button, a, [role="button"]');
      console.log('530: Found buttons in shadow:', Array.from(buttons).slice(0, 5).map(b => b.textContent?.trim()));
    }

    // Last resort: Create our own container at the bottom of the post
    const fallbackContainer = document.createElement('div');
    fallbackContainer.style.cssText = 'padding: 8px 12px; display: flex; gap: 8px;';
    if (postElement.shadowRoot) {
      postElement.shadowRoot.appendChild(fallbackContainer);
    } else {
      postElement.appendChild(fallbackContainer);
    }
    actionsContainer = fallbackContainer;
    console.log('530: Created fallback actions container');
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
    border-radius: 16px;
    padding: 6px 16px;
    font-weight: 600;
    font-size: 12px;
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

    // Add images with dimensions (use enhanced high-quality URLs)
    for (const imageUrl of postData.images) {
      // Find the corresponding image element to get dimensions
      const imgElement = Array.from(postElement.querySelectorAll('img'))
        .find(img => {
          const imgSrc = getHighQualityRedditImageUrl(img.src);
          return imgSrc === imageUrl || img.src === imageUrl;
        });

      if (imgElement) {
        mediaAssets.push({
          type: 'image',
          url: imageUrl, // Already enhanced by getHighQualityRedditImageUrl
          width: imgElement.naturalWidth || imgElement.width || undefined,
          height: imgElement.naturalHeight || imgElement.height || undefined,
          mimeType: imageUrl.match(/\.(jpg|jpeg)$/i) ? 'image/jpeg' :
                   imageUrl.match(/\.png$/i) ? 'image/png' :
                   imageUrl.match(/\.gif$/i) ? 'image/gif' :
                   imageUrl.match(/\.webp$/i) ? 'image/webp' : 'image/jpeg'
        });
      } else {
        // No matching element found, still add the image
        mediaAssets.push({
          type: 'image',
          url: imageUrl,
          mimeType: imageUrl.match(/\.(jpg|jpeg)$/i) ? 'image/jpeg' :
                   imageUrl.match(/\.png$/i) ? 'image/png' :
                   imageUrl.match(/\.gif$/i) ? 'image/gif' :
                   imageUrl.match(/\.webp$/i) ? 'image/webp' : 'image/jpeg'
        });
      }
    }

    // Add videos with dimensions and duration
    if (postData.isVideo && postData.videoElements.length > 0) {
      for (const videoElement of postData.videoElements) {
        const videoSrc = videoElement.src || videoElement.querySelector('source')?.src;
        if (videoSrc) {
          mediaAssets.push({
            type: 'video',
            url: videoSrc,
            width: videoElement.videoWidth || videoElement.width || undefined,
            height: videoElement.videoHeight || videoElement.height || undefined,
            duration: videoElement.duration && !isNaN(videoElement.duration) ?
                     Math.round(videoElement.duration) : undefined,
            mimeType: videoSrc.match(/\.webm$/i) ? 'video/webm' :
                     videoSrc.match(/\.mp4$/i) ? 'video/mp4' : 'video/mp4'
          });
        }
      }
    }

    console.log('530: Prepared media assets for Reddit post:', mediaAssets.length, 'items');

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
        isVideo: postData.isVideo
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
          console.log('530: Channels saved for Reddit post', savedData);
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
  console.log('530: Reddit button injected');
}

// Debounced function to handle mutation observations
let mutationTimeout = null;
function handleMutations() {
  if (mutationTimeout) {
    clearTimeout(mutationTimeout);
  }

  mutationTimeout = setTimeout(() => {
    processAllPosts();
  }, 100); // Debounce by 100ms to avoid excessive processing
}

// Process all visible posts on the page
function processAllPosts() {
  // New Reddit uses shreddit-post custom elements
  const shredditPosts = document.querySelectorAll('shreddit-post');

  // Old Reddit uses div.thing elements
  const oldRedditPosts = document.querySelectorAll('.thing.link');

  // Other possible selectors for different Reddit versions
  const otherPosts = document.querySelectorAll('.Post, [data-testid="post-container"]');

  // Combine all found posts
  const allPosts = new Set([...shredditPosts, ...oldRedditPosts, ...otherPosts]);

  console.log(`530: Found ${allPosts.size} Reddit posts to process`);

  allPosts.forEach(post => {
    injectButton(post);
  });

  // Single post page (detail view)
  const singlePost = document.querySelector('[data-test-id="post-content"]');
  if (singlePost && !processedPosts.has(singlePost)) {
    injectButton(singlePost);
  }
}

// Observe DOM changes to inject buttons on new posts
function observePosts() {
  // Initial injection for already-loaded posts
  processAllPosts();

  // Create observer for dynamically loaded content (infinite scroll)
  const observer = new MutationObserver(handleMutations);

  // Start observing the document body for new posts
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Also observe URL changes for SPA navigation (Reddit doesn't reload page when navigating)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log('530: URL changed, re-processing posts');
      // Clear cache when URL changes to re-check post status
      postStatusCache.clear();
      // Wait a bit for Reddit to load content
      setTimeout(processAllPosts, 500);
    }
  }).observe(document.querySelector('head > title'), {
    subtree: true,
    characterData: true,
    childList: true
  });

  // Re-scan periodically for any missed posts (every 3 seconds)
  setInterval(() => {
    processAllPosts();
  }, 3000);

  console.log('530 Extension: Reddit observation started with enhanced detection');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observePosts);
} else {
  observePosts();
}

console.log('530 Extension: Reddit observation started');
