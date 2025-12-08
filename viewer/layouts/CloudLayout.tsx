"use client"

import { useCallback } from 'react'
import { ContentScene } from '../core/components'
import { cloudPositioner } from '../core/positioning'
import { useCloudViewStore } from '../core/store/cloudViewStore'

/**
 * CloudLayout - Scattered 3D space layout
 * Items positioned using various algorithms (random, clustered, grid, spiral).
 * Supports zoom levels (distant overview / focused on active item).
 */
export const CloudLayout = () => {
  const zoomLevel = useCloudViewStore(state => state.zoomLevel)
  const organizationMode = useCloudViewStore(state => state.organizationMode)
  const toggleZoom = useCloudViewStore(state => state.toggleZoom)

  const handleToggleFocus = useCallback(() => {
    toggleZoom()
  }, [toggleZoom])

  const handleEscape = useCallback(() => {
    if (zoomLevel === 'focused') {
      useCloudViewStore.setState({ zoomLevel: 'distant' })
    }
  }, [zoomLevel])

  const handleScrollUp = useCallback(() => {
    if (zoomLevel === 'distant') {
      useCloudViewStore.setState({ zoomLevel: 'focused' })
    }
  }, [zoomLevel])

  const handleScrollDown = useCallback(() => {
    if (zoomLevel === 'focused') {
      useCloudViewStore.setState({ zoomLevel: 'distant' })
    }
  }, [zoomLevel])

  return (
    <ContentScene
      positioner={cloudPositioner}
      positionerOptions={{
        organizationMode,
        zoomLevel,
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

export default CloudLayout
