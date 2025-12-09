import React, { useEffect } from 'react'
import { useContentStore } from '../core/store/contentStore'
import SwipeDetector from './SwipeDetector'
import KeyListener from './KeyListener'
import { useControls } from 'leva'
import useSettingStore from '../ui/settings/store'
import { useViewModeStore, VIEW_MODE_CONFIG } from '../core/store/viewModeStore'

interface BehaviorDetectionProps {
  children?: React.ReactNode
}

export const BehaviorDetection = ({ children }:BehaviorDetectionProps) => {
  const useKeyboard = useSettingStore(state => state.useKeyboard)
  const viewMode = useViewModeStore(state => state.viewMode)

  // Disable flat navigation for grid views (pillar) - they have their own navigation handler
  const isGridNavigation = VIEW_MODE_CONFIG[viewMode]?.navigationMode === 'grid'
  const enableFlatNavigation = !isGridNavigation

  return (
    <KeyListener
      onKeyLeft={() => useContentStore.getState().setNextColumn()}
      onKeyRight={() => useContentStore.getState().setPrevColumn()}
      onKeyDown={() => useContentStore.getState().setPrevItem()}
      onKeyUp={() => useContentStore.getState().setNextItem()}
      enabled={useKeyboard && enableFlatNavigation}
    >
      <SwipeDetector
        onSwipeDown={() => useContentStore.getState().setPrevColumn()}
        onSwipeUp={() => useContentStore.getState().setNextColumn()}
        onSwipeLeft={() => useContentStore.getState().setPrevItem()}
        onSwipeRight={() => useContentStore.getState().setNextItem()}
        enabled={enableFlatNavigation}
      >
        {children}
      </SwipeDetector>
    </KeyListener>
  )
}

export default BehaviorDetection