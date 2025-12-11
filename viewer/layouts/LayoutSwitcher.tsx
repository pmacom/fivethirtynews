"use client"

import React, { useCallback, useState, useMemo } from 'react'
import { useViewModeStore, ViewMode } from '../core/store/viewModeStore'
import { useCloudViewStore } from '../core/store/cloudViewStore'
import { ContentScene } from '../core/components'
import {
  pillarPositioner,
  cloudPositioner,
  stackPositioner,
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

const VIEW_MODE_CONFIGS: Record<ViewMode, ViewModeConfig> = {
  pillar: {
    positioner: pillarPositioner,
    enableWheelZoom: false,
  },
  cloud: {
    positioner: cloudPositioner,
    enableWheelZoom: true,
  },
  stack: {
    positioner: stackPositioner,
    enableWheelZoom: true,
    itemHoverAnimation: {
      liftY: 0.8,
      liftZ: 1.5,
      tiltX: -0.15,
      scale: 1,
    },
  },
  carousel: {
    positioner: carouselPositioner,
    enableWheelZoom: false,
  },
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

  // Stack-specific state
  const [stackFocused, setStackFocused] = useState(false)

  // Get config for current view mode
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

  // Build hover animation with focus state for stack
  const itemHoverAnimation = useMemo(() => {
    if (viewMode === 'stack') {
      return {
        ...config.itemHoverAnimation,
        scale: stackFocused ? 1.5 : 1,
      }
    }
    return config.itemHoverAnimation
  }, [viewMode, config.itemHoverAnimation, stackFocused])

  // Toggle focus handler (cloud zoom / stack focus)
  const handleToggleFocus = useCallback(() => {
    if (viewMode === 'cloud') {
      toggleCloudZoom()
    } else if (viewMode === 'stack') {
      setStackFocused(prev => !prev)
    }
  }, [viewMode, toggleCloudZoom])

  // Escape handler
  const handleEscape = useCallback(() => {
    if (viewMode === 'cloud' && cloudZoomLevel === 'focused') {
      useCloudViewStore.setState({ zoomLevel: 'distant' })
    } else if (viewMode === 'stack' && stackFocused) {
      setStackFocused(false)
    }
  }, [viewMode, cloudZoomLevel, stackFocused])

  // Scroll up handler (zoom in)
  const handleScrollUp = useCallback(() => {
    if (viewMode === 'cloud' && cloudZoomLevel === 'distant') {
      useCloudViewStore.setState({ zoomLevel: 'focused' })
    } else if (viewMode === 'stack' && !stackFocused) {
      setStackFocused(true)
    }
  }, [viewMode, cloudZoomLevel, stackFocused])

  // Scroll down handler (zoom out)
  const handleScrollDown = useCallback(() => {
    if (viewMode === 'cloud' && cloudZoomLevel === 'focused') {
      useCloudViewStore.setState({ zoomLevel: 'distant' })
    } else if (viewMode === 'stack' && stackFocused) {
      setStackFocused(false)
    }
  }, [viewMode, cloudZoomLevel, stackFocused])

  return (
    <ContentScene
      positioner={config.positioner}
      positionerOptions={positionerOptions}
      itemHoverAnimation={itemHoverAnimation}
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
