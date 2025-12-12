"use client"

import { useMemo, useCallback, useRef, useEffect, useState } from 'react'
import { animated } from '@react-spring/three'

import { useContentStore } from '../store/contentStore'
import { useSceneStore } from '../../scene/store'
import { useFlattenedContent } from '../hooks/useFlattenedContent'
import { useCanvasResize } from '../hooks/useCanvasResize'
import { ContentItem } from './ContentItem'
import { Deck } from './Deck'
import { getCategoryInfo } from '../positioning/utils'
import { FlattenedItem } from '../positioning/types'

// Layout constants
const DECK_SPACING = 0.15         // Z-spacing between items in a deck
const HOVER_RAISE = 0.5           // How much item raises on hover (preview)
const ACTIVE_RAISE = 2.0          // How much item raises when active
const STACK_Y_POSITION = -0.3     // Stacks positioned near bottom of screen
const RACK_SPACING_BASE = 0.2     // Base spacing added to content width

interface StackSceneProps {
  deckSpacing?: number
  hoverRaise?: number
  activeRaise?: number
  debug?: boolean
}

/**
 * StackScene - Multiple deck stacks arranged side-by-side like vinyl bin racks
 *
 * One stack per category, positioned horizontally. Each stack allows:
 * - Hover to preview: Item raises slightly so user can see it
 * - Click to activate: Item raises much higher and camera zooms to it
 *
 * Interaction flow:
 * 1. User hovers over a stack - item under pointer raises for preview
 * 2. User clicks the previewed item - it becomes "active" and raises higher
 * 3. Camera zooms to the active item
 */
export function StackScene({
  deckSpacing = DECK_SPACING,
  hoverRaise = HOVER_RAISE,
  activeRaise = ACTIVE_RAISE,
  debug = true,  // Enable debug to visualize hit meshes
}: StackSceneProps) {
  const hasInitializedRef = useRef(false)
  const cameraInitializedRef = useRef(false)

  // Track which item in which category is active (categoryIndex -> itemIndex)
  const [activeState, setActiveState] = useState<{
    categoryIndex: number
    itemIndex: number
  } | null>(null)

  // Get flattened content and category info
  const flattenedContent = useFlattenedContent()
  const { items, categories, hasContent } = flattenedContent

  // Get canvas size for dynamic sizing
  const { canvasWidth, canvasHeight } = useCanvasResize()

  // Calculate dynamic deck dimensions based on viewport aspect ratio
  // Content planes use: planeHeight = 1.0, planeWidth = 1.0 * aspect
  const contentAspect = canvasWidth / canvasHeight
  const deckWidth = 1.0 * contentAspect   // Match content plane width
  const deckHeight = 1.0                   // Match content plane height

  // Dynamic rack spacing based on content width (so stacks don't overlap)
  const rackSpacing = deckWidth + RACK_SPACING_BASE

  // Get category info for grouping items
  const { categoryCount, itemsPerCategory } = useMemo(
    () => getCategoryInfo(items),
    [items]
  )

  // Calculate rack positions (centered around origin, positioned near bottom)
  const rackPositions = useMemo(() => {
    const positions: [number, number, number][] = []
    const totalWidth = (categoryCount - 1) * rackSpacing
    const startX = -totalWidth / 2

    for (let i = 0; i < categoryCount; i++) {
      positions.push([startX + i * rackSpacing, STACK_Y_POSITION, 0])
    }

    return positions
  }, [categoryCount, rackSpacing])

  // Position camera to see all stacks on mount and resize
  useEffect(() => {
    const camera = useSceneStore.getState().camera
    if (!camera || categoryCount === 0) return

    // Calculate camera distance to see all stacks
    const totalWidth = (categoryCount - 1) * rackSpacing + deckWidth
    const cameraDistance = Math.max(totalWidth * 0.6, 4)

    camera.setLookAt(
      0,                          // Center X
      STACK_Y_POSITION + 0.5,     // Slightly above stacks
      cameraDistance,             // Back from origin
      0,                          // Look at center X
      STACK_Y_POSITION,           // Look at stack Y level
      0,                          // Look at Z=0
      !cameraInitializedRef.current  // Smooth only after first init
    )
    cameraInitializedRef.current = true
  }, [categoryCount, rackSpacing, deckWidth, canvasWidth, canvasHeight])

  // Initialize active item if needed
  useEffect(() => {
    if (items.length > 0 && !hasInitializedRef.current) {
      const currentActiveId = useContentStore.getState().activeItemId
      const activeItem = items.find((item) => item.contentId === currentActiveId)

      if (activeItem) {
        setActiveState({
          categoryIndex: activeItem.categoryIndex,
          itemIndex: activeItem.itemIndex,
        })
      } else {
        // Default to first item
        const firstItem = items[0]
        useContentStore.setState({
          activeCategoryId: firstItem.categoryId,
          activeCategoryIndex: firstItem.categoryIndex,
          activeItemId: firstItem.contentId,
          activeItemData: firstItem.itemData,
          activeItemIndex: firstItem.itemIndex,
        })
        setActiveState({
          categoryIndex: firstItem.categoryIndex,
          itemIndex: firstItem.itemIndex,
        })
      }
      hasInitializedRef.current = true
    }
  }, [items])

  // Handle hover change from a deck
  const handleHoverChange = useCallback(
    (categoryIndex: number, itemIndex: number | null) => {
      if (itemIndex === null) {
        useContentStore.getState().setHoveredItem(null)
        return
      }

      const categoryItems = itemsPerCategory.get(categoryIndex)
      if (!categoryItems) return

      const item = categoryItems[itemIndex]
      if (item) {
        useContentStore.getState().setHoveredItem(item.itemData)
      }
    },
    [itemsPerCategory]
  )

  // Handle item click - make it active and zoom camera
  const handleItemClick = useCallback(
    async (categoryIndex: number, itemIndex: number) => {
      const categoryItems = itemsPerCategory.get(categoryIndex)
      if (!categoryItems) return

      const item = categoryItems[itemIndex]
      if (!item) return

      // Update active state
      setActiveState({ categoryIndex, itemIndex })

      // Update content store
      useContentStore.setState({
        activeCategoryId: item.categoryId,
        activeCategoryIndex: item.categoryIndex,
        activeItemId: item.contentId,
        activeItemData: item.itemData,
        activeItemIndex: item.itemIndex,
      })

      // Zoom camera to the active item
      // Calculate item's world position
      const rackPosition = rackPositions[categoryIndex]
      if (!rackPosition) return

      const itemZ = itemIndex * deckSpacing
      const itemY = activeRaise // Item will be raised to this height

      const targetX = rackPosition[0]
      const targetY = itemY
      const targetZ = itemZ

      // Get camera and zoom to the item
      const camera = useSceneStore.getState().camera
      if (camera) {
        // Position camera in front of and slightly above the item
        const cameraDistance = 3
        await camera.setLookAt(
          targetX,
          targetY + 0.5,
          targetZ + cameraDistance,
          targetX,
          targetY,
          targetZ,
          true // smooth transition
        )
      }
    },
    [itemsPerCategory, rackPositions, deckSpacing, activeRaise]
  )

  // Handle individual item hover (direct interaction bypass)
  const handleDirectItemHover = useCallback((item: FlattenedItem | null) => {
    useContentStore.getState().setHoveredItem(item?.itemData ?? null)
  }, [])

  // Handle individual item click (direct interaction bypass)
  const handleDirectItemClick = useCallback(
    (item: FlattenedItem) => {
      handleItemClick(item.categoryIndex, item.itemIndex)
    },
    [handleItemClick]
  )

  if (!hasContent) {
    return null
  }

  return (
    <group>
      {/* Render one Deck per category */}
      {Array.from(itemsPerCategory.entries()).map(([categoryIndex, categoryItems]) => {
        const position = rackPositions[categoryIndex]
        if (!position) return null

        // Determine active item index for this deck
        const activeIndexInDeck =
          activeState?.categoryIndex === categoryIndex
            ? activeState.itemIndex
            : null

        return (
          <Deck
            key={categoryIndex}
            position={position}
            spacing={deckSpacing}
            hoverRaiseAmount={hoverRaise}
            activeRaiseAmount={activeRaise}
            activeIndex={activeIndexInDeck}
            width={deckWidth}
            height={deckHeight}
            onHoverChange={(idx) => handleHoverChange(categoryIndex, idx)}
            onItemClick={(idx) => handleItemClick(categoryIndex, idx)}
            debug={debug}
          >
            {categoryItems.map((item, idx) => (
              <ContentItem
                key={item.id}
                item={item}
                transform={{
                  position: [0, 0, 0],
                  rotation: [0, 0, 0],
                  scale: 1,
                }}
                isActive={
                  activeState?.categoryIndex === categoryIndex &&
                  activeState?.itemIndex === idx
                }
                isHovered={false}
                onHover={handleDirectItemHover}
                onClick={handleDirectItemClick}
                disablePointerEvents={true}  // Stack mode relies on deck mesh for selection
              />
            ))}
          </Deck>
        )
      })}

      {/* Category labels (optional - can be added later) */}
      {debug &&
        categories.map((category, idx) => {
          const position = rackPositions[idx]
          if (!position) return null

          return (
            <group key={`label-${idx}`} position={[position[0], -1, 0]}>
              {/* Placeholder for category label */}
              <mesh>
                <boxGeometry args={[0.5, 0.1, 0.1]} />
                <meshBasicMaterial color="white" />
              </mesh>
            </group>
          )
        })}
    </group>
  )
}

export default StackScene
