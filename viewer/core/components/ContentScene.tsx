"use client"

import { useMemo, useCallback, useRef, useEffect, useState } from 'react'
import { animated } from '@react-spring/three'

import { useContentStore } from '../store/contentStore'
import { useSceneStore } from '../../scene/store'
import { useFlattenedContent, buildPositionerConfig } from '../hooks/useFlattenedContent'
import { useLayoutAnimation } from '../hooks/useLayoutAnimation'
import { useContentNavigation, useWheelNavigation } from '../hooks/useContentNavigation'
import { usePillarNavigation } from '../hooks/usePillarNavigation'
import { useCanvasResize } from '../hooks/useCanvasResize'
import { ContentItem } from './ContentItem'
import {
  Positioner,
  HoverAnimation,
  FlattenedItem,
  PositionerConfig,
} from '../positioning/types'

interface ContentSceneProps {
  positioner: Positioner
  positionerOptions?: Record<string, any>
  itemHoverAnimation?: HoverAnimation
  enableNavigation?: boolean
  enableWheelZoom?: boolean
  onToggleFocus?: () => void
  onEscape?: () => void
  onScrollUp?: () => void
  onScrollDown?: () => void
}

/**
 * ContentScene - The unified scene component that orchestrates everything
 *
 * Responsibilities:
 * - Gets flattened content via useFlattenedContent
 * - Computes positions via positioner
 * - Manages animation via useLayoutAnimation
 * - Renders ContentItem components
 * - Integrates navigation via useContentNavigation
 */
export function ContentScene({
  positioner,
  positionerOptions,
  itemHoverAnimation,
  enableNavigation = true,
  enableWheelZoom = false,
  onToggleFocus,
  onEscape,
  onScrollUp,
  onScrollDown,
}: ContentSceneProps) {
  const hasInitializedRef = useRef(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Get flattened content
  const flattenedContent = useFlattenedContent()
  const { items, categories, activeGlobalIndex, hasContent } = flattenedContent

  // Get canvas size and handle resize
  const { canvasWidth, canvasHeight } = useCanvasResize()

  // Build positioner config
  const positionerConfig: PositionerConfig = useMemo(() =>
    buildPositionerConfig(flattenedContent, canvasWidth, canvasHeight, positionerOptions),
    [flattenedContent, canvasWidth, canvasHeight, positionerOptions]
  )

  // Get group transform from positioner
  const groupTransform = useMemo(() =>
    positioner.getGroupTransform(positionerConfig),
    [positioner, positionerConfig]
  )

  // Animate group transform
  const {
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scale,
  } = useLayoutAnimation({
    groupTransform,
    animationConfig: positioner.getAnimationConfig(),
    cameraFitOnly: positioner.cameraFitOnly,
  })

  // Determine navigation mode from positioner
  const isGridNavigation = positioner.navigationMode === 'grid'

  // Setup flat navigation (for non-grid layouts)
  useContentNavigation({
    items,
    activeGlobalIndex,
    enabled: enableNavigation && !isGridNavigation,
    onToggleFocus,
    onEscape,
  })

  // Setup grid navigation (for pillar layout - swipe/arrow key support)
  usePillarNavigation({
    items,
    activeGlobalIndex,
    enabled: enableNavigation && isGridNavigation,
    onToggleFocus,
    onEscape,
  })

  // Setup wheel navigation (for zoom toggle)
  useWheelNavigation({
    enabled: enableWheelZoom,
    onScrollUp,
    onScrollDown,
  })

  // Initialize active item if needed
  useEffect(() => {
    if (items.length > 0 && !hasInitializedRef.current) {
      const currentActiveId = useContentStore.getState().activeItemId
      const hasValidActive = items.some(item => item.contentId === currentActiveId)

      if (!hasValidActive) {
        const firstItem = items[0]
        useContentStore.setState({
          activeCategoryId: firstItem.categoryId,
          activeCategoryIndex: firstItem.categoryIndex,
          activeItemId: firstItem.contentId,
          activeItemData: firstItem.itemData,
          activeItemIndex: firstItem.itemIndex,
        })
      }
      hasInitializedRef.current = true
    }
  }, [items])

  // Handle hover
  const handleHover = useCallback((item: FlattenedItem | null) => {
    setHoveredIndex(item?.globalIndex ?? null)
    useContentStore.getState().setHoveredItem(item?.itemData ?? null)
  }, [])

  // Handle click - select item (camera focus handled by useLayoutAnimation onRest)
  const handleClick = useCallback((item: FlattenedItem) => {
    // Update active item in store - use contentId for data lookups
    useContentStore.setState({
      activeCategoryId: item.categoryId,
      activeCategoryIndex: item.categoryIndex,
      activeItemId: item.contentId,
      activeItemData: item.itemData,
      activeItemIndex: item.itemIndex,
    })
    // Note: focusOnContent is called by useLayoutAnimation.onAnimationComplete
    // to avoid duplicate calls that cause camera jumping
  }, [])

  // Compute item transforms
  const itemTransforms = useMemo(() =>
    items.map((_, i) => positioner.getItemTransform(i, positionerConfig)),
    [items, positioner, positionerConfig]
  )

  // Nothing to render while loading
  if (!hasContent) {
    return null
  }

  return (
    <animated.group
      position-x={positionX}
      position-y={positionY}
      position-z={positionZ}
      rotation-x={rotationX}
      rotation-y={rotationY}
      rotation-z={rotationZ}
      scale={scale}
    >
      {items.map((item, i) => (
        <ContentItem
          key={item.id}
          item={item}
          transform={itemTransforms[i]}
          isActive={i === activeGlobalIndex}
          isHovered={i === hoveredIndex}
          hoverAnimation={itemHoverAnimation}
          onHover={handleHover}
          onClick={handleClick}
        />
      ))}
    </animated.group>
  )
}

export default ContentScene
