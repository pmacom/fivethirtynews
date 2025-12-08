'use client'

import { useState, useEffect } from 'react'

const MOBILE_BREAKPOINT = 768

export type Orientation = 'portrait' | 'landscape'

export interface MobileLayoutState {
  isMobile: boolean
  orientation: Orientation
  isPortrait: boolean
  isLandscape: boolean
}

/**
 * Hook to detect mobile layout and orientation
 * Uses window dimensions to determine mobile state
 */
export function useMobileLayout(): MobileLayoutState {
  const [state, setState] = useState<MobileLayoutState>({
    isMobile: false,
    orientation: 'portrait',
    isPortrait: true,
    isLandscape: false,
  })

  useEffect(() => {
    const checkLayout = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const isMobile = width < MOBILE_BREAKPOINT
      const orientation: Orientation = height > width ? 'portrait' : 'landscape'

      setState({
        isMobile,
        orientation,
        isPortrait: orientation === 'portrait',
        isLandscape: orientation === 'landscape',
      })
    }

    // Initial check
    checkLayout()

    // Listen for resize and orientation changes
    window.addEventListener('resize', checkLayout)
    window.addEventListener('orientationchange', checkLayout)

    return () => {
      window.removeEventListener('resize', checkLayout)
      window.removeEventListener('orientationchange', checkLayout)
    }
  }, [])

  return state
}

export default useMobileLayout
