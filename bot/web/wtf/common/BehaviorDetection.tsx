import React from 'react'
import ContentStore from "../Content/contentStore"
import SwipeDetector from './SwipeDetector'
import KeyListener from './KeyListener'
import SettingStore from "../Settings/settingsStore"
import { useStoreValue } from 'zustand-x'

interface BehaviorDetectionProps {
  children?: React.ReactNode
  onKeyLeft?: () => void
  onKeyRight?: () => void
  onKeyUp?: () => void
  onKeyDown?: () => void
  onSwipeDown?: () => void
  onSwipeUp?: () => void
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}

export const BehaviorDetection = ({
  children,
  onKeyLeft,
  onKeyRight,
  onKeyUp,
  onKeyDown,
  onSwipeDown,
  onSwipeUp,
  onSwipeLeft,
  onSwipeRight
}: BehaviorDetectionProps) => {
  const useKeyboard = useStoreValue(SettingStore, 'useKeyboard')

  return (
    <KeyListener
      onKeyLeft={onKeyLeft}
      onKeyRight={onKeyRight}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      enabled={useKeyboard}
    >
      <SwipeDetector
        onSwipeDown={onSwipeDown}
        onSwipeUp={onSwipeUp}
        onSwipeLeft={onSwipeLeft}
        onSwipeRight={onSwipeRight}
      >
        {children}
      </SwipeDetector>
    </KeyListener>
  )
}

export default BehaviorDetection