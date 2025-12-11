'use client';

import React from 'react';
import { CiSettings } from 'react-icons/ci';
import { useNavigationStore } from '../navigation/store';
import useSettingStore from '../settings/store';

interface GlobalSettingsButtonProps {
  /** Additional CSS classes */
  className?: string;
  /** Z-index override (default: 200) */
  zIndex?: number;
}

/**
 * Consistent settings button that appears in the top-right corner
 * across all menu screens (Splash, Main Menu, Stage Select, Characters)
 */
export function GlobalSettingsButton({ className = '', zIndex = 200 }: GlobalSettingsButtonProps) {
  const toggleSettings = useSettingStore((state) => state.toggleSettings);
  const showSettings = useSettingStore((state) => state.showSettings);

  return (
    <button
      onClick={toggleSettings}
      className={`
        fixed top-4 right-4
        w-10 h-10
        flex items-center justify-center
        rounded-full
        border-2
        transition-all duration-200
        ${showSettings
          ? 'bg-arcade-yellow/20 border-arcade-yellow text-arcade-yellow'
          : 'bg-black/50 border-white/30 text-white/70 hover:border-white/60 hover:text-white hover:bg-black/70'
        }
        backdrop-blur-sm
        ${className}
      `}
      style={{ zIndex }}
      title="Settings"
      aria-label="Open settings"
    >
      <CiSettings
        className={`w-5 h-5 transition-transform duration-300 ${showSettings ? 'rotate-90' : ''}`}
      />
    </button>
  );
}

export default GlobalSettingsButton;
