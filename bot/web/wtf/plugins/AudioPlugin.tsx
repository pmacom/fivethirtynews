"use client"

import React from 'react';
import AudioListener from '../Audio/AudioListener';
import AudioSettings from '../Audio/AudioSettings';

/**
 * AudioPlugin - Optional audio reactivity plugin for WTF viewer
 *
 * Provides:
 * - Real-time audio analysis (low, mid, high frequencies)
 * - Audio device selection
 * - Audio settings UI
 *
 * Usage:
 * <WTF content={data} enableAudio={true} />
 */
export const AudioPlugin = () => {
  return (
    <>
      <AudioListener />
    </>
  );
};

/**
 * AudioSettingsUI - Settings panel for audio configuration
 * Include this in your Settings component when audio is enabled
 */
export const AudioSettingsUI = () => {
  return <AudioSettings />;
};

export default AudioPlugin;
