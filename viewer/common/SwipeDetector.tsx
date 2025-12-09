import React, { useState } from 'react'
import { useSectionExitStore } from '../ui/sectionexit/store'

interface SwipeDetectorProps {
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  enabled?: boolean
  children: React.ReactNode
}

const SwipeDetector: React.FC<SwipeDetectorProps> = ({ 
  onSwipeUp, 
  onSwipeDown, 
  onSwipeLeft, 
  onSwipeRight, 
  enabled = true, 
  children 
}) => {
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [touchEndX, setTouchEndX] = useState<number | null>(null)
  const [touchStartY, setTouchStartY] = useState<number | null>(null)
  const [touchEndY, setTouchEndY] = useState<number | null>(null)

  const minSwipeDistance = 50 // minimum distance to consider it a swipe

  const onTouchStart = (e: React.TouchEvent) => {
    if (!enabled) return
    setTouchEndX(null) // reset touch end values
    setTouchEndY(null)
    setTouchStartX(e.targetTouches[0].clientX)
    setTouchStartY(e.targetTouches[0].clientY)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!enabled) return
    setTouchEndX(e.targetTouches[0].clientX)
    setTouchEndY(e.targetTouches[0].clientY)
  }

  const onTouchEnd = () => {
    if (!enabled || touchStartX === null || touchStartY === null || touchEndX === null || touchEndY === null) return

    // Don't process swipes when section exit modal is open
    if (useSectionExitStore.getState().isVisible) return

    const distanceX = touchStartX - touchEndX
    const distanceY = touchStartY - touchEndY

    const isLeftSwipe = distanceX > minSwipeDistance
    const isRightSwipe = distanceX < -minSwipeDistance
    const isUpSwipe = distanceY > minSwipeDistance
    const isDownSwipe = distanceY < -minSwipeDistance

    if (isLeftSwipe && onSwipeLeft) onSwipeLeft()
    if (isRightSwipe && onSwipeRight) onSwipeRight()
    if (isUpSwipe && onSwipeUp) onSwipeUp()
    if (isDownSwipe && onSwipeDown) onSwipeDown()

    // Reset touch points after the swipe is detected
    setTouchStartX(null)
    setTouchStartY(null)
  }

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {children}
    </div>
  )
}

export default SwipeDetector
