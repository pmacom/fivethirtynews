/**
 * Safe messaging utility for Chrome extension
 * Handles "Extension context invalidated" errors gracefully
 */

// Track if we've already shown the invalidation warning
let hasShownInvalidationWarning = false;

/**
 * Check if the extension context is still valid
 */
export function isExtensionContextValid(): boolean {
  try {
    return !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

/**
 * Show a toast notification to the user
 */
function showInvalidationToast() {
  if (hasShownInvalidationWarning) return;
  hasShownInvalidationWarning = true;

  // Create toast element
  const toast = document.createElement('div');
  toast.id = 'ft-extension-toast';
  toast.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #1f1f23;
      border: 1px solid #3f3f46;
      border-radius: 8px;
      padding: 12px 16px;
      color: #e4e4e7;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 10px;
      animation: ft-toast-in 0.3s ease;
    ">
      <span style="font-size: 16px;">⚠️</span>
      <div>
        <div style="font-weight: 600; margin-bottom: 2px;">530 Extension Updated</div>
        <div style="color: #a1a1aa; font-size: 12px;">Please refresh this page to continue</div>
      </div>
      <button onclick="this.parentElement.remove()" style="
        background: none;
        border: none;
        color: #71717a;
        cursor: pointer;
        padding: 4px;
        margin-left: 8px;
      ">✕</button>
    </div>
    <style>
      @keyframes ft-toast-in {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
    </style>
  `;
  document.body.appendChild(toast);

  // Auto-remove after 10 seconds
  setTimeout(() => {
    toast.remove();
  }, 10000);
}

/**
 * Safely send a message to the background script
 * Returns null if the extension context is invalidated
 */
export async function safeSendMessage<T = any>(
  message: { action: string; data?: any }
): Promise<T | null> {
  // Check context validity first
  if (!isExtensionContextValid()) {
    showInvalidationToast();
    return null;
  }

  try {
    const response = await chrome.runtime.sendMessage(message);
    return response as T;
  } catch (error: any) {
    // Handle extension context invalidated error
    if (
      error?.message?.includes('Extension context invalidated') ||
      error?.message?.includes('message port closed')
    ) {
      showInvalidationToast();
      return null;
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Helper to check if a response indicates an invalidated context
 */
export function isValidResponse(response: any): boolean {
  return response !== null && response !== undefined;
}
