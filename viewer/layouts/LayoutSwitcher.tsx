"use client"

import React, { Suspense } from 'react'
import { useViewModeStore } from '../core/store/viewModeStore'

// Lazy load all layouts for consistent behavior
const PillarLayout = React.lazy(() => import('./PillarLayout'))
const CloudLayout = React.lazy(() => import('./CloudLayout'))
const StackLayout = React.lazy(() => import('./StackLayout'))
const CarouselLayout = React.lazy(() => import('./CarouselLayout'))

export const LayoutSwitcher = () => {
  const viewMode = useViewModeStore(state => state.viewMode)

  switch (viewMode) {
    case 'cloud':
      return (
        <Suspense fallback={null}>
          <CloudLayout />
        </Suspense>
      )
    case 'stack':
      return (
        <Suspense fallback={null}>
          <StackLayout />
        </Suspense>
      )
    case 'carousel':
      return (
        <Suspense fallback={null}>
          <CarouselLayout />
        </Suspense>
      )
    case 'pillar':
    default:
      return (
        <Suspense fallback={null}>
          <PillarLayout />
        </Suspense>
      )
  }
}

export default LayoutSwitcher
