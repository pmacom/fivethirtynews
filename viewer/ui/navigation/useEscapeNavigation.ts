import { useEffect, useRef, useCallback } from 'react';
import { useNavigationStore } from './store';

interface UseEscapeNavigationOptions {
  /** Whether this hook is enabled (default: true) */
  enabled?: boolean;
  /** Callback when navigating back one level */
  onBack?: () => void;
  /** Callback when exiting to viewer */
  onExitToViewer?: () => void;
}

/**
 * Hook for handling ESC key navigation
 * - Single ESC: Go back one level in navigation history
 * - Double-tap ESC (within 300ms): Exit directly to 3D viewer
 * - Hold ESC (500ms): Exit directly to 3D viewer
 * - Respects input focus (no action when typing in input/textarea)
 */
export function useEscapeNavigation(options: UseEscapeNavigationOptions = {}) {
  const { enabled = true, onBack, onExitToViewer } = options;

  const { popScreen, exitToViewer, canGoBack, currentScreen } = useNavigationStore();

  // Track timing for double-tap and hold detection
  const lastEscTime = useRef<number>(0);
  const holdTimer = useRef<NodeJS.Timeout | null>(null);
  const isHolding = useRef<boolean>(false);

  const DOUBLE_TAP_THRESHOLD = 300; // ms
  const HOLD_THRESHOLD = 500; // ms

  const handleExitToViewer = useCallback(() => {
    exitToViewer();
    onExitToViewer?.();
  }, [exitToViewer, onExitToViewer]);

  const handleBack = useCallback(() => {
    if (canGoBack()) {
      popScreen();
      onBack?.();
    }
  }, [canGoBack, popScreen, onBack]);

  const clearHoldTimer = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    isHolding.current = false;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if ESC key is not pressed
      if (e.key !== 'Escape') return;

      // Ignore if focus is on an input element
      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      // Ignore if already on viewer (nowhere to go)
      if (currentScreen === 'viewer') return;

      e.preventDefault();

      const now = Date.now();
      const timeSinceLastEsc = now - lastEscTime.current;

      // Check for double-tap
      if (timeSinceLastEsc < DOUBLE_TAP_THRESHOLD && timeSinceLastEsc > 50) {
        clearHoldTimer();
        handleExitToViewer();
        lastEscTime.current = 0;
        return;
      }

      // Start hold timer
      lastEscTime.current = now;
      clearHoldTimer();

      holdTimer.current = setTimeout(() => {
        if (isHolding.current) {
          handleExitToViewer();
        }
      }, HOLD_THRESHOLD);

      isHolding.current = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      // If we released before hold threshold, treat as single press
      if (isHolding.current && holdTimer.current) {
        clearHoldTimer();

        // Only go back if we haven't already handled as double-tap
        const now = Date.now();
        const timeSinceLastEsc = now - lastEscTime.current;

        if (timeSinceLastEsc < HOLD_THRESHOLD) {
          handleBack();
        }
      }

      isHolding.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearHoldTimer();
    };
  }, [enabled, currentScreen, handleBack, handleExitToViewer, clearHoldTimer]);

  return {
    goBack: handleBack,
    exitToViewer: handleExitToViewer,
    canGoBack: canGoBack(),
  };
}

export default useEscapeNavigation;
