// 530 Content Script - YouTube Integration
console.log('530 Extension: YouTube content script loaded');

// Configuration
const CONFIG = {
  buttonText: '530',
  buttonClass: 'five-thirty-button-youtube',
  containerClass: 'five-thirty-container-youtube'
};

// Track which videos already have buttons
const processedVideos = new WeakSet();
const videoStatusCache = new Map();

// Extract video ID from current URL
function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

// Check if video exists in database
async function checkVideoStatus(videoId) {
  if (videoStatusCache.has(videoId)) {
    return videoStatusCache.get(videoId);
  }

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'checkContentExists',
      data: {
        platform: 'youtube',
        contentId: videoId
      }
    });

    const status = response.success ? response.data : { exists: false, content: null };
    videoStatusCache.set(videoId, status);
    return status;
  } catch (error) {
    console.error('530: Failed to check video status', error);
    return { exists: false, content: null };
  }
}

// Update button appearance based on video status
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
    button.setAttribute('title', 'Tag this video');
  }
}

// Parse YouTube date text to ISO timestamp
function parseDateText(dateText) {
  if (!dateText) return null;

  try {
    // Handle formats like "Oct 11, 2025", "Premiered Oct 11, 2025", "Aug 26, 2025"
    const cleanDate = dateText
      .replace(/Premiered\s+/i, '')
      .replace(/Streamed live on\s+/i, '')
      .trim();

    // Try to parse the date
    const parsed = new Date(cleanDate);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }

    return null;
  } catch (error) {
    console.error('530: Failed to parse date:', dateText, error);
    return null;
  }
}

// Parse ISO 8601 duration format (e.g., "PT2M34S" -> 154 seconds)
function parseISO8601Duration(duration) {
  if (!duration) return null;

  try {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return null;

    const hours = parseInt(match[1] || 0, 10);
    const minutes = parseInt(match[2] || 0, 10);
    const seconds = parseInt(match[3] || 0, 10);

    return hours * 3600 + minutes * 60 + seconds;
  } catch (error) {
    console.error('530: Failed to parse duration:', duration, error);
    return null;
  }
}

// Extract channel username/handle from URL or page
function extractChannelUsername(channelUrl) {
  if (!channelUrl) return null;

  try {
    // Extract from URL patterns:
    // /c/Username, /@username, /channel/UCxxxxx, /user/username
    const match = channelUrl.match(/\/@([^/]+)|\/c\/([^/]+)|\/user\/([^/]+)|\/channel\/([^/]+)/);
    if (match) {
      // Prefer @username format, then c/, user/, or channel ID as fallback
      return match[1] || match[2] || match[3] || match[4];
    }

    return null;
  } catch (error) {
    console.error('530: Failed to extract channel username:', error);
    return null;
  }
}

// Extract video metadata from page
function extractVideoMetadata() {
  const videoId = getVideoId();
  if (!videoId) return null;

  // Extract title
  const titleElement = document.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string') ||
                      document.querySelector('h1.ytd-watch-metadata yt-formatted-string') ||
                      document.querySelector('h1.title yt-formatted-string') ||
                      document.querySelector('meta[name="title"]') ||
                      document.querySelector('meta[property="og:title"]');
  const title = titleElement?.textContent?.trim() ||
               titleElement?.content ||
               document.title.replace(' - YouTube', '');

  // Extract description (try multiple selectors)
  const descriptionElement = document.querySelector('#description-inline-expander yt-formatted-string') ||
                            document.querySelector('#description yt-formatted-string') ||
                            document.querySelector('.ytd-expandable-video-description-body-renderer') ||
                            document.querySelector('meta[name="description"]') ||
                            document.querySelector('meta[property="og:description"]');
  const description = descriptionElement?.textContent?.trim() ||
                     descriptionElement?.content;

  // Extract author/channel name
  const channelElement = document.querySelector('#channel-name a') ||
                        document.querySelector('ytd-channel-name a') ||
                        document.querySelector('#owner-name a');
  const channelName = channelElement?.textContent?.trim();
  const channelUrl = channelElement?.getAttribute('href');

  // Extract channel username/handle
  const channelUsername = extractChannelUsername(channelUrl);

  // Extract channel avatar
  const channelAvatarElement = document.querySelector('#owner #avatar img') ||
                              document.querySelector('ytd-video-owner-renderer img') ||
                              document.querySelector('#channel-thumbnail img');
  const channelAvatar = channelAvatarElement?.getAttribute('src');

  // Extract thumbnail with fallback chain
  // YouTube thumbnail sizes: maxresdefault (1920x1080) → hqdefault (480x360) → default (120x90)
  // Use hqdefault as it's reliably available for all videos
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  // Extract view count
  const viewsElement = document.querySelector('.ytd-video-view-count-renderer .view-count') ||
                      document.querySelector('span.view-count') ||
                      document.querySelector('#info span.view-count');
  const viewsText = viewsElement?.textContent?.trim();

  // Extract upload date
  const dateElement = document.querySelector('#info-strings yt-formatted-string') ||
                     document.querySelector('#info .date') ||
                     document.querySelector('meta[itemprop="uploadDate"]');
  const dateText = dateElement?.textContent?.trim() || dateElement?.content;
  const contentCreatedAt = parseDateText(dateText);

  // Extract duration from meta tag (ISO 8601 format: PT2M34S)
  const durationMeta = document.querySelector('meta[itemprop="duration"]');
  const durationISO = durationMeta?.getAttribute('content');
  const duration = parseISO8601Duration(durationISO);

  // Get video element dimensions
  const videoElement = document.querySelector('video.html5-main-video');
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
    videoHeight
  };
}

// Inject the 530 button below the video
async function injectButton() {
  const videoId = getVideoId();
  if (!videoId) return;

  // Find the actions container (like, dislike, share buttons)
  const actionsContainer = document.querySelector('#top-level-buttons-computed') ||
                          document.querySelector('ytd-menu-renderer.ytd-video-primary-info-renderer');

  if (!actionsContainer) {
    console.log('530: Actions container not found yet');
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
  const button = document.createElement('button');
  button.className = CONFIG.buttonClass;
  button.textContent = CONFIG.buttonText;
  button.setAttribute('data-video-id', videoId);
  button.setAttribute('aria-label', 'Tag with 530');
  button.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 18px;
    padding: 8px 20px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 8px;
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

  // Check if video already exists
  const videoStatus = await checkVideoStatus(videoId);
  const existingChannels = videoStatus.exists && videoStatus.content?.channels ? videoStatus.content.channels : [];
  const existingPrimaryChannel = videoStatus.exists && videoStatus.content?.primary_channel ? videoStatus.content.primary_channel : null;
  updateButtonAppearance(button, videoStatus.exists, existingChannels.length);

  // Click handler - show tag modal
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Prepare content data with rich media assets
    const contentData = {
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
          mimeType: 'video/mp4'
        },
        // Thumbnail as secondary asset
        {
          type: 'image',
          url: videoData.thumbnailUrl,
          mimeType: 'image/jpeg'
        }
      ],
      contentCreatedAt: videoData.contentCreatedAt,
      metadata: {
        viewsText: videoData.viewsText,
        dateText: videoData.dateText,
        duration: videoData.duration
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
          console.log('530: Channels saved for YouTube video', savedData);
          // Update button appearance
          const newChannelCount = savedData.channels ? savedData.channels.length : 0;
          updateButtonAppearance(button, true, newChannelCount);
          // Update cache
          videoStatusCache.set(videoId, { exists: true, content: savedData });
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
          videoStatusCache.set(videoId, { exists: true, content: savedData });
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
  console.log('530: YouTube button injected');
}

// Observe DOM changes and URL changes
let currentVideoId = null;

function checkForNewVideo() {
  const videoId = getVideoId();

  if (videoId && videoId !== currentVideoId) {
    currentVideoId = videoId;
    console.log('530: New video detected:', videoId);

    // Note: We can't clear WeakSet, but we don't need to since we check for existing buttons in DOM
    // The actionsContainer will be different for each video anyway

    // Wait for video info to load, then inject button
    setTimeout(() => {
      injectButton();
    }, 1000);
  }
}

// Observe for video changes (YouTube is a SPA)
function observeVideoChanges() {
  // Watch for URL changes with debouncing
  let lastUrl = location.href;
  let urlCheckTimeout;

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

  // Also observe for DOM changes to detect when action buttons load, but throttle it
  let injectionTimeout;
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
    subtree: true
  });

  // Initial check
  checkForNewVideo();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observeVideoChanges);
} else {
  observeVideoChanges();
}

console.log('530 Extension: YouTube observation started');

// ============================================
// COMMENT CAPTURE FUNCTIONALITY
// ============================================

// Track processed comments
const processedComments = new WeakSet();

// Extract comment data from YouTube comment element
function extractCommentData(commentElement) {
  try {
    // Get comment ID from element
    const commentId = commentElement.getAttribute('comment-id') ||
                     commentElement.id ||
                     `comment_${Date.now()}`;

    // Extract comment text
    const textElement = commentElement.querySelector('#content-text, #comment-content, yt-formatted-string#content-text');
    const commentText = textElement?.textContent?.trim();

    if (!commentText) {
      console.log('530: No comment text found');
      return null;
    }

    // Extract author info
    const authorElement = commentElement.querySelector('#author-text');
    const authorName = authorElement?.textContent?.trim();
    const authorLink = commentElement.querySelector('#author-text a, a#author-text');
    const authorUrl = authorLink?.getAttribute('href');
    const authorUsername = authorUrl ? authorUrl.replace('/@', '').replace('/channel/', '') : null;

    // Extract author avatar
    const avatarElement = commentElement.querySelector('#author-thumbnail img, img#img');
    const authorAvatar = avatarElement?.getAttribute('src');

    // Extract likes count
    const likeButton = commentElement.querySelector('#vote-count-middle, #vote-count-left');
    const likesText = likeButton?.textContent?.trim();
    const likesCount = likesText ? parseInt(likesText.replace(/[^0-9]/g, '')) : 0;

    // Extract timestamp
    const timeElement = commentElement.querySelector('.published-time-text a, a.yt-simple-endpoint');
    const timeText = timeElement?.textContent?.trim();

    // Build comment URL
    const videoId = getVideoId();
    const commentUrl = `https://www.youtube.com/watch?v=${videoId}&lc=${commentId}`;

    console.log('530: Extracted comment data:', {
      commentId,
      author: authorName,
      likes: likesCount,
      textPreview: commentText.substring(0, 50)
    });

    return {
      commentId,
      commentText,
      authorName,
      authorUsername,
      authorAvatar,
      authorUrl: authorUrl ? `https://www.youtube.com${authorUrl}` : null,
      likesCount,
      commentUrl,
      timeText,
      videoId
    };
  } catch (error) {
    console.error('530: Error extracting comment data:', error);
    return null;
  }
}

// Save comment to database
async function saveComment(commentData, videoData) {
  try {
    console.log('530: Saving comment...');

    // Prepare content ID for parent video
    const contentId = `youtube:${commentData.videoId}`;

    // Send to background script
    const response = await chrome.runtime.sendMessage({
      action: 'saveComment',
      data: {
        contentId,
        videoData, // In case parent content doesn't exist yet
        comment: {
          platform: 'youtube',
          platformCommentId: commentData.commentId,
          commentText: commentData.commentText,
          commentUrl: commentData.commentUrl,
          authorName: commentData.authorName,
          authorUsername: commentData.authorUsername,
          authorAvatarUrl: commentData.authorAvatar,
          authorUrl: commentData.authorUrl,
          likesCount: commentData.likesCount || 0
        }
      }
    });

    if (response.success) {
      console.log('530: Comment saved successfully');
      return true;
    } else {
      console.error('530: Failed to save comment:', response.error);
      return false;
    }
  } catch (error) {
    console.error('530: Error saving comment:', error);
    return false;
  }
}

// Inject 530 button on comment
function injectCommentButton(commentElement) {
  if (processedComments.has(commentElement)) return;
  processedComments.add(commentElement);

  // Find action buttons toolbar
  const toolbar = commentElement.querySelector('#action-buttons, ytd-comment-action-buttons-renderer');
  if (!toolbar) {
    console.log('530: Comment toolbar not found');
    return;
  }

  // Check if button already exists
  if (toolbar.querySelector('.five-thirty-comment-button')) {
    return;
  }

  // Create 530 button
  const button = document.createElement('button');
  button.className = 'five-thirty-comment-button';
  button.textContent = '530';
  button.setAttribute('aria-label', 'Save comment with 530');
  button.style.cssText = `
    color: #667eea;
    background: transparent;
    border: none;
    font-weight: 600;
    font-size: 12px;
    cursor: pointer;
    padding: 6px 12px;
    border-radius: 18px;
    transition: all 0.2s ease;
    margin-left: 8px;
  `;

  // Hover effect
  button.addEventListener('mouseenter', () => {
    button.style.background = '#f3f4f6';
  });

  button.addEventListener('mouseleave', () => {
    button.style.background = 'transparent';
  });

  // Click handler
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const commentData = extractCommentData(commentElement);
    if (!commentData) {
      alert('Could not extract comment data');
      return;
    }

    // Get video data for parent content
    const videoData = extractVideoMetadata();

    // Save comment
    button.textContent = 'Saving...';
    button.disabled = true;

    const success = await saveComment(commentData, videoData);

    if (success) {
      button.textContent = '✓ Saved';
      button.style.color = '#10b981';
      setTimeout(() => {
        button.textContent = '530';
        button.style.color = '#667eea';
        button.disabled = false;
      }, 2000);
    } else {
      button.textContent = '✗ Failed';
      button.style.color = '#ef4444';
      setTimeout(() => {
        button.textContent = '530';
        button.style.color = '#667eea';
        button.disabled = false;
      }, 2000);
    }
  });

  toolbar.appendChild(button);
  console.log('530: Comment button injected');
}

// Observe comments section for new comments
function observeComments() {
  console.log('530: Starting comment observation...');

  // Find comments section
  const commentsSection = document.querySelector('#comments, ytd-comments#comments');
  if (!commentsSection) {
    console.log('530: Comments section not found, will retry...');
    setTimeout(observeComments, 2000);
    return;
  }

  console.log('530: Comments section found');

  // Process existing comments
  const existingComments = document.querySelectorAll('ytd-comment-view-model, ytd-comment-thread-renderer');
  console.log(`530: Found ${existingComments.length} existing comments`);
  existingComments.forEach(comment => {
    injectCommentButton(comment);
  });

  // Observe for new comments (infinite scroll)
  const observer = new MutationObserver(() => {
    const comments = document.querySelectorAll('ytd-comment-view-model, ytd-comment-thread-renderer');
    comments.forEach(comment => {
      injectCommentButton(comment);
    });
  });

  observer.observe(commentsSection, {
    childList: true,
    subtree: true
  });

  console.log('530: Comment observation active');
}

// Start comment observation after a delay (let video load first)
setTimeout(observeComments, 3000);
