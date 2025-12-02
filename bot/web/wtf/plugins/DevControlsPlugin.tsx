"use client"

import React from 'react';
import { Leva } from 'leva';
import Settings from '../Settings/Settings';
import { SettingsOptions, CameraOptions, LevaOptions } from '../Settings/SettingsOptions';
import { AudioSettingsUI } from './AudioPlugin';

interface DevControlsPluginProps {
  enableAudio?: boolean;
}

/**
 * DevControlsPlugin - Optional development controls plugin for WTF viewer
 *
 * Provides:
 * - Leva control panel for tweaking 3D parameters
 * - Settings panel with UI options
 * - Camera controls
 * - Audio settings (if audio is enabled)
 *
 * Usage:
 * <WTF content={data} enableDevControls={true} />
 *
 * Note: Typically only enabled in development environments
 */
export const DevControlsPlugin = ({ enableAudio = false }: DevControlsPluginProps) => {
  return (
    <>
      <Leva collapsed={false} />
      <Settings>
        <SettingsOptions />
        <CameraOptions />
        <LevaOptions />
        {enableAudio && <AudioSettingsUI />}
      </Settings>
    </>
  );
};

export default DevControlsPlugin;
