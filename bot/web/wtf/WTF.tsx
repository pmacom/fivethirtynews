"use client"

import React, { useEffect, useMemo } from 'react'
import { UI } from './UI/UI'
import Legend from './Legend/Legend'
import ContentStore from './Content/contentStore'
import BehaviorDetection from './common/BehaviorDetection'
import Scene from './Scene/Scene'
import { Pillar } from './Pillar/Pillar'
import Details from './Details/Details'
import { Logo530 } from './Models/Logo530'
import { WTFProps } from './types'
import AudioPlugin from './plugins/AudioPlugin'
import DevControlsPlugin from './plugins/DevControlsPlugin'
import { useStoreValue } from 'zustand-x'

/**
 * WTF - Web Three Fiber 3D Content Viewer
 *
 * A props-based, modular 3D content visualization system
 *
 * @example
 * // Simple usage
 * <WTF content={myContentData} />
 *
 * @example
 * // With callbacks and plugins
 * <WTF
 *   content={myContentData}
 *   onItemChange={(id, index, data) => console.log('Selected:', data)}
 *   enableAudio={true}
 *   enableDevControls={process.env.NODE_ENV === 'development'}
 * />
 */
export const WTF = ({
  content,
  initialCategoryId,
  initialItemId,
  onCategoryChange,
  onItemChange,
  onItemClick,
  showLegend = true,
  showDetails = true,
  children,
  enableAudio = false,
  enableDevControls = false,
  enableKeyboard = true,
  enableSwipe = true,
  className,
}: WTFProps) => {

  // Initialize content store with prop data
  useEffect(() => {
    if (!content || content.length === 0) {
      console.warn('WTF: No content provided');
      return;
    }

    ContentStore.set('setContent', content);
    ContentStore.set('setInitialActive', initialCategoryId, initialItemId);
  }, [content, initialCategoryId, initialItemId]);

  // Subscribe to category changes and fire callback
  const activeCategoryId = useStoreValue(ContentStore, 'activeCategoryId');
  const activeCategoryIndex = useStoreValue(ContentStore, 'activeCategoryIndex');

  useEffect(() => {
    if (onCategoryChange && activeCategoryId) {
      onCategoryChange(activeCategoryId, activeCategoryIndex);
    }
  }, [activeCategoryId, activeCategoryIndex, onCategoryChange]);

  // Subscribe to item changes and fire callback
  const activeItemId = useStoreValue(ContentStore, 'activeItemId');
  const activeItemIndex = useStoreValue(ContentStore, 'activeItemIndex');
  const activeItemData = useStoreValue(ContentStore, 'activeItemData');

  useEffect(() => {
    if (onItemChange && activeItemId && activeItemData) {
      onItemChange(activeItemId, activeItemIndex, activeItemData);
    }
  }, [activeItemId, activeItemIndex, activeItemData, onItemChange]);

  // Handle navigation with keyboard/swipe based on props
  const handlePrevColumn = useMemo(() => {
    return () => ContentStore.set('setPrevColumn');
  }, []);

  const handleNextColumn = useMemo(() => {
    return () => ContentStore.set('setNextColumn');
  }, []);

  const handlePrevItem = useMemo(() => {
    return () => ContentStore.set('setPrevItem');
  }, []);

  const handleNextItem = useMemo(() => {
    return () => ContentStore.set('setNextItem');
  }, []);

  return (
    <div className={className}>
      <BehaviorDetection
        onKeyLeft={enableKeyboard ? handlePrevColumn : undefined}
        onKeyRight={enableKeyboard ? handleNextColumn : undefined}
        onKeyUp={enableKeyboard ? handlePrevItem : undefined}
        onKeyDown={enableKeyboard ? handleNextItem : undefined}
        onSwipeDown={enableSwipe ? handlePrevColumn : undefined}
        onSwipeUp={enableSwipe ? handleNextColumn : undefined}
        onSwipeLeft={enableSwipe ? handlePrevItem : undefined}
        onSwipeRight={enableSwipe ? handleNextItem : undefined}
      >
        <Scene>
          <Pillar />
          <directionalLight position={[10, 10, 10]} intensity={1} />
          <Logo530 />
          {children}
        </Scene>

        <UI>
          {showLegend && <Legend />}
          {showDetails && <Details />}
        </UI>

        {/* Optional Plugins */}
        {enableAudio && <AudioPlugin />}
        {enableDevControls && <DevControlsPlugin enableAudio={enableAudio} />}
      </BehaviorDetection>
    </div>
  )
}

export default WTF
