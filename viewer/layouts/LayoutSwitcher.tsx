"use client"

import React, { useCallback, useMemo } from 'react'
import { useViewModeStore, ViewMode } from '../core/store/viewModeStore'
import { useCloudViewStore } from '../core/store/cloudViewStore'
import { ContentScene, StackScene } from '../core/components'
import {
  pillarPositioner,
  cloudPositioner,
  carouselPositioner,
  Positioner,
  HoverAnimation,
} from '../core/positioning'

/**
 * Configuration for each view mode
 */
interface ViewModeConfig {
  positioner: Positioner
  enableWheelZoom: boolean
  itemHoverAnimation?: HoverAnimation
}

const VIEW_MODE_CONFIGS: Partial<Record<ViewMode, ViewModeConfig>> = {
  pillar: {
    positioner: pillarPositioner,
    enableWheelZoom: false,
  },
  cloud: {
    positioner: cloudPositioner,
    enableWheelZoom: true,
  },
  carousel: {
    positioner: carouselPositioner,
    enableWheelZoom: false,
  },
  // Note: 'stack' mode uses StackScene component directly, not ContentScene
}

/**
 * LayoutSwitcher - Unified layout component that handles all view modes
 *
 * Uses a single ContentScene with dynamic positioner to enable smooth
 * animated transitions between view modes. Items animate from their
 * old positions to new positions when switching modes.
 */
export const LayoutSwitcher = () => {
  const viewMode = useViewModeStore(state => state.viewMode)

  // Cloud-specific state
  const cloudZoomLevel = useCloudViewStore(state => state.zoomLevel)
  const cloudOrganizationMode = useCloudViewStore(state => state.organizationMode)
  const toggleCloudZoom = useCloudViewStore(state => state.toggleZoom)

  // Get config for current view mode (may be undefined for stack which uses its own scene)
  const config = VIEW_MODE_CONFIGS[viewMode]

  // Build positioner options based on view mode
  const positionerOptions = useMemo(() => {
    if (viewMode === 'cloud') {
      return {
        organizationMode: cloudOrganizationMode,
        zoomLevel: cloudZoomLevel,
      }
    }
    return undefined
  }, [viewMode, cloudOrganizationMode, cloudZoomLevel])

  // Toggle focus handler (cloud zoom)
  const handleToggleFocus = useCallback(() => {
    if (viewMode === 'cloud') {
      toggleCloudZoom()
    }
  }, [viewMode, toggleCloudZoom])

  // Escape handler
  const handleEscape = useCallback(() => {
    if (viewMode === 'cloud' && cloudZoomLevel === 'focused') {
      useCloudViewStore.setState({ zoomLevel: 'distant' })
    }
  }, [viewMode, cloudZoomLevel])

  // Scroll up handler (zoom in)
  const handleScrollUp = useCallback(() => {
    if (viewMode === 'cloud' && cloudZoomLevel === 'distant') {
      useCloudViewStore.setState({ zoomLevel: 'focused' })
    }
  }, [viewMode, cloudZoomLevel])

  // Scroll down handler (zoom out)
  const handleScrollDown = useCallback(() => {
    if (viewMode === 'cloud' && cloudZoomLevel === 'focused') {
      useCloudViewStore.setState({ zoomLevel: 'distant' })
    }
  }, [viewMode, cloudZoomLevel])

  // Stack mode uses its own specialized scene component
  if (viewMode === 'stack') {
    return <StackScene />
  }

  // For other modes, use ContentScene with positioner
  if (!config) {
    return null
  }

  return (
    <ContentScene
      positioner={config.positioner}
      positionerOptions={positionerOptions}
      itemHoverAnimation={config.itemHoverAnimation}
      enableNavigation={true}
      enableWheelZoom={config.enableWheelZoom}
      onToggleFocus={handleToggleFocus}
      onEscape={handleEscape}
      onScrollUp={handleScrollUp}
      onScrollDown={handleScrollDown}
    />
  )
}

export default LayoutSwitcher
