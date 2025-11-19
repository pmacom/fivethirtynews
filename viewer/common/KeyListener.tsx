import { useControls } from 'leva';
import React, { useCallback, useEffect, useState } from 'react';
// import { EpisodeViewStore } from '../stores/EpisodeViewStore';
import { create } from "zustand";
import useSettingStore from '../ui/settings/store';

interface KeyListenerProps {
  enabled?: boolean;
  children?: React.ReactNode;
  onKeyLeft?: () => void;
  onKeyRight?: () => void;
  onKeyUp?: () => void;
  onKeyDown?: () => void;
  onKeySpace?: () => void;
}

export const KeyListener = ({ enabled = true, children, onKeyLeft, onKeyRight, onKeyDown, onKeyUp, onKeySpace }: KeyListenerProps) => {
  const [hovered, setHovered] = useState(false);
  const useKeyboard = useSettingStore(state => state.useKeyboard)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore Shift + Command + C
      if (e.shiftKey && e.metaKey && e.key.toLowerCase() === 'c') {
        return;  // Allow default behavior for this key combination
      }

      // e.preventDefault();

      // if (!hovered) return;  // Only proceed if the element is hovered

      const key = e.key;
      if (key === 'ArrowLeft') {
        onKeyLeft?.();
      } else if (key === 'ArrowRight') {
        onKeyRight?.();
      } else if (key === ' ') {
        onKeySpace?.();
      } else if (key === 'ArrowDown') {
        onKeyDown?.();
      } else if (key === 'ArrowUp') {
        onKeyUp?.();
      }

      if (e.defaultPrevented) {
        return; // Do nothing if the event was already processed
      }
    },
    [hovered, onKeyLeft, onKeyRight, onKeySpace]
  );

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  const onMouseEnter = useCallback(() => {
    useKeyListenerStore.setState({ isHovered: true })
    setHovered(true)
  }, [setHovered])

  const onMouseLeave = useCallback(() => {
    useKeyListenerStore.setState({ isHovered: false })
    setHovered(false)
  }, [setHovered])

  return (
    <>
      {useKeyboard && (
        <div
          className='h-screen w-screen fixed top-0 left-0'
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
        </div>
      )}
      {children}
    </>
  );
};



interface KeyListenerStoreState {
  isHovered: boolean;
}
export const useKeyListenerStore = create<KeyListenerStoreState>()((set, get) => ({
  isHovered: false,
}))



export default KeyListener;
