"use client"

import { useState, useCallback } from 'react'
import { ContentScene } from '../core/components'
import { stackPositioner } from '../core/positioning'

/**
 * StackLayout - Stacked cards layout
 * Items stacked vertically with depth, featuring hover lift animations.
 */
export const StackLayout = () => {
  const [isFocused, setIsFocused] = useState(false)

  const handleToggleFocus = useCallback(() => {
    setIsFocused(prev => !prev)
  }, [])

  const handleEscape = useCallback(() => {
    if (isFocused) {
      setIsFocused(false)
    }
  }, [isFocused])

  const handleScrollUp = useCallback(() => {
    if (!isFocused) {
      setIsFocused(true)
    }
  }, [isFocused])

  const handleScrollDown = useCallback(() => {
    if (isFocused) {
      setIsFocused(false)
    }
  }, [isFocused])

  return (
    <ContentScene
      positioner={stackPositioner}
      itemHoverAnimation={{
        liftY: 0.8,
        liftZ: 1.5,
        tiltX: -0.15,
        scale: isFocused ? 1.5 : 1,
      }}
      enableNavigation={true}
      enableWheelZoom={true}
      onToggleFocus={handleToggleFocus}
      onEscape={handleEscape}
      onScrollUp={handleScrollUp}
      onScrollDown={handleScrollDown}
    />
  )
}

export default StackLayout
