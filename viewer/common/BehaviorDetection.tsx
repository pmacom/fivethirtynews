import React, { useEffect } from 'react'
import { useContentStore } from '../core/store/contentStore'
import SwipeDetector from './SwipeDetector'
import KeyListener from './KeyListener'
import { useControls } from 'leva'
import useSettingStore from '../ui/settings/store'

interface BehaviorDetectionProps {
  children?: React.ReactNode
}

export const BehaviorDetection = ({ children }:BehaviorDetectionProps) => {
  const useKeyboard = useSettingStore(state => state.useKeyboard)

  return (
    <KeyListener
      onKeyLeft={() => useContentStore.getState().setPrevColumn()}
      onKeyRight={() => useContentStore.getState().setNextColumn()}
      onKeyDown={() => useContentStore.getState().setPrevItem()}
      onKeyUp={() => useContentStore.getState().setNextItem()}
      enabled={useKeyboard}
    >
      <SwipeDetector
        onSwipeDown={() => useContentStore.getState().setPrevColumn()}
        onSwipeUp={() => useContentStore.getState().setNextColumn()}
        onSwipeLeft={() => useContentStore.getState().setPrevItem()}
        onSwipeRight={() => useContentStore.getState().setNextItem()}
      >
        {children}
      </SwipeDetector>
    </KeyListener>
  )
}

export default BehaviorDetection