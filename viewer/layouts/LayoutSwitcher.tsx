"use client"

import React, { Suspense } from 'react'
import { useViewModeStore } from '../core/store/viewModeStore'
import { Pillar } from '../pillar/pillar'

// Lazy load alternative layouts
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
      return <Pillar />
  }
}

export default LayoutSwitcher
