import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ChannelSelectorPopup } from '../components/ChannelSelector';
import { notesStyles } from '../components/NotesSection';

// Global state for the popup
let popupRoot: Root | null = null;
let popupContainer: HTMLDivElement | null = null;

// Inline styles for the popup (injected into shadow DOM) - DARK THEME, COMPACT
export function getPopupStyles(): string {
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

    .ft-groups {
      display: flex;
      justify-content: center;
      gap: 2px;
      padding: 8px 6px;
      border-bottom: 1px solid #27272a;
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

    .ft-group-btn:hover {
      background: #27272a;
      color: #e4e4e7;
    }

    .ft-group-btn.active {
      background: #27272a;
      color: #e4e4e7;
    }

    .ft-group-btn.has-selection {
      color: #a1a1aa;
    }

    .ft-group-btn.has-primary {
      color: #f59e0b;
    }

    .ft-group-btn .icon {
      display: flex;
      align-items: center;
      justify-content: center;
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

    ${notesStyles}
  `;
}

// Show the React popup
export function showPopup(
  anchorElement: HTMLElement,
  postData: any,
  existingChannels: string[],
  existingPrimaryChannel: string | null,
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
        onSave={(data) => {
          onSave(data);
        }}
        onClose={closePopup}
      />
    </React.StrictMode>
  );
}

// Close the popup
export function closePopup() {
  if (popupRoot) {
    popupRoot.unmount();
    popupRoot = null;
  }
  if (popupContainer) {
    popupContainer.remove();
    popupContainer = null;
  }
}

// Check if extension context is still valid
export function isExtensionContextValid(): boolean {
  return !!chrome.runtime?.id;
}

// Update button appearance based on post status
export function updateButtonAppearance(button: HTMLButtonElement, exists: boolean, tagCount = 0) {
  if (exists) {
    button.textContent = `530 ✓`;
    button.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    button.setAttribute('data-tagged', 'true');
    button.setAttribute('title', `Tagged with ${tagCount} channel(s) - click to edit`);
  } else {
    button.textContent = '530';
    button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    button.setAttribute('data-tagged', 'false');
    button.setAttribute('title', 'Tag this post');
  }
}

// Create a styled 530 button
export function createButton(id: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'five-thirty-button';
  button.textContent = '530';
  button.setAttribute('data-content-id', id);
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

  return button;
}
