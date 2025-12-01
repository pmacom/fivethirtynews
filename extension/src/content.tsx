import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ChannelSelectorPopup } from './components/ChannelSelector';
import { safeSendMessage, isExtensionContextValid } from './shared/messaging';
import './styles/index.css';

console.log('530 Extension: React content script loaded');

// Types
interface PostData {
  platform: string;
  platformContentId: string;
  tweetId?: string;
  tweetText?: string;
  content?: string;
  author?: string;
  authorUsername?: string;
  authorUrl?: string;
  authorAvatarUrl?: string;
  url: string;
  thumbnailUrl?: string;
  mediaAssets?: MediaAsset[];
  timestamp?: string;
}

interface MediaAsset {
  type: 'image' | 'video';
  url: string;
  width?: number;
  height?: number;
  duration?: number;
  mimeType?: string;
}

// Configuration
const CONFIG = {
  buttonText: '530',
  buttonClass: 'five-thirty-button',
  containerClass: 'five-thirty-container',
};

// Track which posts already have buttons
const processedPosts = new WeakSet<Element>();
const postStatusCache = new Map<string, { exists: boolean; post: any }>();

// Global state for the popup
let popupRoot: Root | null = null;
let popupContainer: HTMLDivElement | null = null;

// Check if post exists in database
async function checkPostStatus(tweetId: string) {
  if (postStatusCache.has(tweetId)) {
    return postStatusCache.get(tweetId)!;
  }

  // Check if extension context is still valid
  if (!isExtensionContextValid()) {
    return { exists: false, post: null };
  }

  try {
    const response = await safeSendMessage<{ success: boolean; data: { exists: boolean; post: any } }>({
      action: 'checkPostExists',
      data: { tweetId },
    });

    if (!response) {
      // Extension context invalidated - safeSendMessage handles the toast
      return { exists: false, post: null };
    }

    const status = response.success ? response.data : { exists: false, post: null };
    postStatusCache.set(tweetId, status);
    return status;
  } catch (error: any) {
    console.error('530: Failed to check post status', error);
    return { exists: false, post: null };
  }
}

// Update button appearance based on post status
function updateButtonAppearance(button: HTMLButtonElement, exists: boolean, tagCount = 0) {
  if (exists) {
    button.textContent = `530 ✓`;
    button.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    button.setAttribute('data-tagged', 'true');
    button.setAttribute('title', `Tagged with ${tagCount} channel(s) - click to edit`);
  } else {
    button.textContent = CONFIG.buttonText;
    button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    button.setAttribute('data-tagged', 'false');
    button.setAttribute('title', 'Tag this post');
  }
}

// Show the React popup
function showPopup(
  anchorElement: HTMLElement,
  postData: PostData,
  existingChannels: string[],
  existingPrimaryChannel: string | null,
  existingTags: string[],
  onSave: (data: any) => void
) {
  // Close existing popup if any
  closePopup();

  // Create container for the popup
  popupContainer = document.createElement('div');
  popupContainer.id = 'five-thirty-popup-root';
  document.body.appendChild(popupContainer);

  // Create shadow DOM for style isolation
  const shadowRoot = popupContainer.attachShadow({ mode: 'open' });

  // Create a container inside shadow DOM
  const shadowContainer = document.createElement('div');
  shadowContainer.id = 'five-thirty-shadow-container';
  shadowRoot.appendChild(shadowContainer);

  // Inject styles into shadow DOM
  const styleSheet = document.createElement('style');
  styleSheet.textContent = getPopupStyles();
  shadowRoot.appendChild(styleSheet);

  // Create React root and render
  popupRoot = createRoot(shadowContainer);
  popupRoot.render(
    <React.StrictMode>
      <ChannelSelectorPopup
        anchorElement={anchorElement}
        postData={postData}
        existingChannels={existingChannels}
        existingPrimaryChannel={existingPrimaryChannel}
        existingTags={existingTags}
        onSave={(data) => {
          onSave(data);
        }}
        onClose={closePopup}
      />
    </React.StrictMode>
  );
}

// Close the popup
function closePopup() {
  if (popupRoot) {
    popupRoot.unmount();
    popupRoot = null;
  }
  if (popupContainer) {
    popupContainer.remove();
    popupContainer = null;
  }
}

// Helper: Extract media dimensions and metadata
async function extractMediaAsset(element: HTMLImageElement | HTMLVideoElement): Promise<MediaAsset | null> {
  if (!element) return null;

  const tagName = element.tagName.toLowerCase();

  if (tagName === 'img') {
    const img = element as HTMLImageElement;
    if (!img.complete) {
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        setTimeout(resolve, 1000);
      });
    }

    return {
      type: 'image',
      url: img.src,
      width: img.naturalWidth || img.width || undefined,
      height: img.naturalHeight || img.height || undefined,
      mimeType: img.src.match(/\.(jpg|jpeg)$/i)
        ? 'image/jpeg'
        : img.src.match(/\.png$/i)
        ? 'image/png'
        : img.src.match(/\.gif$/i)
        ? 'image/gif'
        : img.src.match(/\.webp$/i)
        ? 'image/webp'
        : 'image/jpeg',
    };
  } else if (tagName === 'video') {
    const video = element as HTMLVideoElement;
    return {
      type: 'video',
      url: video.src || video.querySelector('source')?.src || '',
      width: video.videoWidth || video.width || undefined,
      height: video.videoHeight || video.height || undefined,
      duration: video.duration && !isNaN(video.duration) ? Math.round(video.duration) : undefined,
      mimeType: 'video/mp4',
    };
  }

  return null;
}

// Inject the 530 button into X.com post action bars
async function injectButton(article: Element) {
  if (processedPosts.has(article)) return;
  processedPosts.add(article);

  const actionBar = article.querySelector('[role="group"]');
  if (!actionBar) return;

  const tweetLink = article.querySelector('a[href*="/status/"]') as HTMLAnchorElement;
  if (!tweetLink) return;

  const tweetId = tweetLink.href.match(/status\/(\d+)/)?.[1];
  if (!tweetId) return;

  const tweetTextElement = article.querySelector('[data-testid="tweetText"]');
  const tweetText = tweetTextElement?.textContent || '';

  const authorElement = article.querySelector('[data-testid="User-Name"]');
  const displayNameSpan = authorElement?.querySelector('span > span');
  const author = displayNameSpan?.textContent || '';

  const usernameLink = authorElement?.querySelector('a[role="link"]') as HTMLAnchorElement;
  const usernameText = usernameLink?.textContent || '';
  const authorUsername = usernameText.replace('@', '');
  const authorUrl = usernameLink?.href || '';

  const avatarImg = article.querySelector('[data-testid="Tweet-User-Avatar"] img') as HTMLImageElement;
  const authorAvatarUrl = avatarImg?.src || '';

  const imageElements = article.querySelectorAll('[data-testid="tweetPhoto"] img, [data-testid="card.layoutLarge.media"] img');
  const videoElements = article.querySelectorAll('video');
  const allMediaElements = [...Array.from(imageElements), ...Array.from(videoElements)] as (HTMLImageElement | HTMLVideoElement)[];

  const firstImage = imageElements[0] as HTMLImageElement;
  const thumbnailUrl = firstImage?.src || null;

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
  const existingTags = postStatus.exists && postStatus.post?.tags ? postStatus.post.tags : [];
  updateButtonAppearance(button, postStatus.exists, existingChannels.length);

  // Click handler - show React popup
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('530: Button clicked!');

    // Extract rich media assets with dimensions
    const mediaAssets: MediaAsset[] = [];
    for (const element of allMediaElements) {
      const asset = await extractMediaAsset(element);
      if (asset && asset.url) {
        mediaAssets.push(asset);
      }
    }

    // Prepare post data
    const postData: PostData = {
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
      thumbnailUrl: thumbnailUrl || undefined,
      mediaAssets: mediaAssets.length > 0 ? mediaAssets : undefined,
      timestamp: new Date().toISOString(),
    };

    // Show React popup
    showPopup(button, postData, existingChannels, existingPrimaryChannel, existingTags, (savedData) => {
      console.log('530: Channels saved', savedData);
      const newChannelCount = savedData.channels ? savedData.channels.length : 0;
      updateButtonAppearance(button, true, newChannelCount);
      postStatusCache.set(tweetId, { exists: true, post: savedData });
    });
  });

  container.appendChild(button);
  actionBar.appendChild(container);
}

// Observe DOM changes to inject buttons on new posts
function observePosts() {
  const observer = new MutationObserver(() => {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    articles.forEach((article) => {
      injectButton(article);
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Initial injection for already-loaded posts
  const articles = document.querySelectorAll('article[data-testid="tweet"]');
  articles.forEach((article) => {
    injectButton(article);
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observePosts);
} else {
  observePosts();
}

console.log('530 Extension: React observation started');

// Inline styles for the popup (injected into shadow DOM) - DARK THEME, TWO-COLUMN LAYOUT
function getPopupStyles(): string {
  return `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .ft-popup {
      position: fixed;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .ft-popup-content {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      width: 280px;
      max-width: calc(100vw - 16px);
      overflow: hidden;
    }

    /* Two-column layout */
    .ft-popup-content.ft-two-column {
      width: 480px;
    }

    .ft-body {
      display: flex;
      min-height: 200px;
      max-height: 320px;
    }

    /* Left column - Categories */
    .ft-categories-column {
      width: 140px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 8px;
      border-right: 1px solid #27272a;
      overflow-y: auto;
      background: #1a1a1d;
    }

    .ft-category-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 10px;
      background: transparent;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
      color: #71717a;
      text-align: left;
      position: relative;
    }

    .ft-category-btn:hover {
      background: #27272a;
      color: #e4e4e7;
    }

    .ft-category-btn.active {
      background: #27272a;
      color: #e4e4e7;
    }

    .ft-category-btn.has-selection {
      color: #a1a1aa;
    }

    .ft-category-btn.has-primary {
      color: #f59e0b;
    }

    .ft-category-btn .icon {
      display: flex;
      flex-shrink: 0;
    }

    .ft-category-btn .name {
      font-size: 11px;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ft-category-btn .star {
      font-size: 10px;
      color: #f59e0b;
      margin-left: auto;
    }

    .ft-category-btn .dot {
      width: 5px;
      height: 5px;
      background: #667eea;
      border-radius: 50%;
      margin-left: auto;
    }

    /* Right panel - Tabs */
    .ft-right-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      padding: 8px;
      overflow: visible;
    }

    .ft-tab-bar {
      display: flex;
      gap: 4px;
      margin-bottom: 8px;
    }

    .ft-tab-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 6px 8px;
      background: #27272a;
      border: none;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      color: #71717a;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .ft-tab-btn:hover {
      background: #3f3f46;
      color: #a1a1aa;
    }

    .ft-tab-btn.active {
      background: #667eea;
      color: #ffffff;
    }

    .ft-tab-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: visible;
    }

    /* Tags Tab */
    .ft-tags-tab {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .ft-tag-input-container {
      position: relative;
      margin-bottom: 8px;
    }

    .ft-search-icon {
      position: absolute;
      left: 8px;
      top: 50%;
      transform: translateY(-50%);
      color: #52525b;
    }

    .ft-tag-search {
      width: 100%;
      padding: 8px 8px 8px 28px;
      background: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 6px;
      font-size: 12px;
      color: #e4e4e7;
      outline: none;
    }

    .ft-tag-search:focus {
      border-color: #667eea;
    }

    .ft-tag-search::placeholder {
      color: #52525b;
    }

    .ft-tag-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 4px;
      background: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 6px;
      max-height: 150px;
      overflow-y: auto;
      z-index: 10;
    }

    .ft-tag-dropdown-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 8px 10px;
      background: transparent;
      border: none;
      font-size: 12px;
      color: #e4e4e7;
      cursor: pointer;
      text-align: left;
    }

    .ft-tag-dropdown-item:hover {
      background: #3f3f46;
    }

    .ft-tag-dropdown-item .usage-count {
      font-size: 10px;
      color: #71717a;
    }

    .ft-tag-dropdown-item.create-new {
      color: #10b981;
      font-weight: 500;
    }

    .ft-selected-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      min-height: 32px;
      padding: 8px;
      background: rgba(39, 39, 42, 0.5);
      border-radius: 6px;
      margin-bottom: 8px;
      align-content: flex-start;
    }

    .ft-tag-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid #10b981;
      border-radius: 12px;
      font-size: 11px;
      color: #34d399;
    }

    .ft-tag-remove {
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: #34d399;
      cursor: pointer;
      padding: 0;
    }

    .ft-tag-remove:hover {
      color: #ef4444;
    }

    .ft-tags-empty {
      font-size: 11px;
      color: #52525b;
      text-align: center;
      width: 100%;
      padding: 4px 0;
    }

    /* Notes Tab */
    .ft-notes-tab {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .ft-notes-tab .ft-notes {
      border-top: none;
      margin-top: 0;
    }

    .ft-notes-tab .ft-notes-header {
      display: none;
    }

    .ft-notes-tab .ft-notes-content {
      padding: 0;
    }

    /* Draft Note Styles */
    .ft-draft-note {
      padding: 8px 0;
    }

    .ft-draft-label {
      font-size: 11px;
      font-weight: 600;
      color: #a1a1aa;
      margin-bottom: 6px;
    }

    .ft-draft-hint {
      font-size: 10px;
      color: #71717a;
      margin-top: 6px;
      text-align: center;
    }

    /* Embedded notes without border */
    .ft-notes.embedded {
      border-top: none;
      margin-top: 0;
    }

    /* Legacy group buttons (hidden) */
    .ft-groups {
      display: none;
    }

    .ft-group-btn {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: transparent;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
      color: #71717a;
    }

    .ft-group-btn .dot {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 6px;
      height: 6px;
      background: #667eea;
      border-radius: 50%;
    }

    .ft-group-btn .star {
      position: absolute;
      top: 0px;
      right: 0px;
      font-size: 10px;
      color: #f59e0b;
    }

    .ft-selected {
      padding: 8px 10px;
      min-height: 36px;
      border-top: 1px solid #27272a;
    }

    .ft-empty {
      font-size: 11px;
      color: #52525b;
      text-align: center;
      padding: 4px 0;
    }

    .ft-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .ft-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 6px;
      font-size: 11px;
      color: #e4e4e7;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .ft-chip:hover {
      background: #3f3f46;
    }

    .ft-chip.primary {
      background: rgba(245, 158, 11, 0.15);
      border-color: #f59e0b;
      color: #fbbf24;
    }

    .ft-chip .star {
      color: #f59e0b;
      font-size: 10px;
    }

    .ft-chip .remove {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      color: #71717a;
      margin-left: 2px;
      transition: all 0.1s ease;
    }

    .ft-chip .remove:hover {
      background: #ef4444;
      color: white;
    }

    .ft-done {
      padding: 8px 10px;
      border-top: 1px solid #27272a;
    }

    .ft-done-btn {
      width: 100%;
      padding: 8px;
      background: #667eea;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .ft-done-btn:hover {
      background: #5a67d8;
    }

    .ft-done-btn:disabled {
      background: #27272a;
      color: #52525b;
      cursor: not-allowed;
    }

    /* Sub-popover (channel list) */
    .ft-sub-popup {
      position: fixed;
      z-index: 2147483648;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 10px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      width: 220px;
      max-height: 280px;
      overflow: hidden;
    }

    .ft-sub-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 10px;
      border-bottom: 1px solid #27272a;
      background: #1f1f23;
    }

    .ft-sub-header .icon {
      color: #a1a1aa;
      display: flex;
    }

    .ft-sub-header .name {
      font-size: 12px;
      font-weight: 600;
      color: #e4e4e7;
    }

    .ft-sub-channels {
      overflow-y: auto;
      max-height: 230px;
      padding: 4px;
    }

    .ft-sub-channels::-webkit-scrollbar {
      width: 4px;
    }

    .ft-sub-channels::-webkit-scrollbar-track {
      background: transparent;
    }

    .ft-sub-channels::-webkit-scrollbar-thumb {
      background: #3f3f46;
      border-radius: 2px;
    }

    .ft-channel {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 6px 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.1s ease;
      text-align: left;
      background: transparent;
      border: none;
      color: #a1a1aa;
    }

    .ft-channel:hover {
      background: #27272a;
    }

    .ft-channel.selected {
      background: #27272a;
      color: #e4e4e7;
    }

    .ft-channel .check {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border: 1.5px solid #3f3f46;
      border-radius: 4px;
      font-size: 10px;
      color: transparent;
      flex-shrink: 0;
      transition: all 0.1s ease;
    }

    .ft-channel.selected .check {
      background: #667eea;
      border-color: #667eea;
      color: white;
    }

    .ft-channel .channel-icon {
      display: flex;
      flex-shrink: 0;
      color: #71717a;
    }

    .ft-channel.selected .channel-icon {
      color: #a1a1aa;
    }

    .ft-channel .info {
      flex: 1;
      min-width: 0;
    }

    .ft-channel .channel-name {
      font-size: 12px;
      font-weight: 500;
      color: inherit;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ft-channel .channel-desc {
      display: none;
    }

    .ft-channel .channel-star {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 4px;
      color: #3f3f46;
      flex-shrink: 0;
      transition: all 0.1s ease;
      background: transparent;
      border: none;
      cursor: pointer;
    }

    .ft-channel .channel-star:hover {
      color: #f59e0b;
    }

    .ft-channel .channel-star.active {
      color: #f59e0b;
    }
  `;
}
