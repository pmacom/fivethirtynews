"use client"

import { useMemo, useCallback, useRef, useEffect, useState } from 'react'
import * as THREE from 'three'

import { useContentStore } from '../store/contentStore'
import { useSceneStore } from '../../scene/store'
import { useBrowseModeStore } from '../store/browseModeStore'
import { useFlattenedContent } from '../hooks/useFlattenedContent'
import { useCanvasResize } from '../hooks/useCanvasResize'
import { ContentItem } from './ContentItem'
import { Deck } from './Deck'
import { getCategoryInfo } from '../positioning/utils'
import { FlattenedItem } from '../positioning/types'

// Layout constants - "vinyl bins on floor, art on wall" metaphor
const DECK_SPACING = 0.15         // Z-spacing between items in a deck
const HOVER_RAISE = 0.6           // How much item raises on hover (preview) - doubled for better visibility
const FLOOR_Y = -1.0              // Y position of deck bins (floor level)
const RACK_SPACING_BASE = 0.15    // Base spacing added to content width between racks

// Two-zone bounding box system
// Deck Zone: 1x height - where vinyl bin racks sit on "floor"
// Content Zone: 3x height - where active content displays (stacked on top)
const CONTENT_ZONE_MULTIPLIER = 3  // Content zone is 3x taller than deck zone

interface StackSceneProps {
  deckSpacing?: number
  hoverRaise?: number
  floorY?: number
  debug?: boolean
}

/**
 * StackScene - Multiple deck stacks arranged side-by-side like vinyl bin racks
 *
 * Uses a two-zone bounding box system:
 * - Deck Zone (1x height): Where vinyl bin racks sit on "floor"
 * - Content Zone (3x height): Where active content displays (stacked on top)
 * - Combined Zone (4x height): Used for fitToBox camera positioning in browse mode
 *
 * Interaction flow:
 * 1. Normal mode: Camera focuses on active content in content zone
 * 2. Browse mode (Tab): Camera fits to combined zone, showing all decks
 * 3. User hovers over decks to preview items
 * 4. User clicks to select - exits browse mode, focuses on new content
 */
export function StackScene({
  deckSpacing = DECK_SPACING,
  hoverRaise = HOVER_RAISE,
  floorY = FLOOR_Y,
  debug = false,
}: StackSceneProps) {
  const hasInitializedRef = useRef(false)
  const sceneGroupRef = useRef<THREE.Group>(null)
  const combinedBoundsRef = useRef<THREE.Mesh>(null)

  // Track which item in which category is active (categoryIndex -> itemIndex)
  const [activeState, setActiveState] = useState<{
    categoryIndex: number
    itemIndex: number
  } | null>(null)

  // Subscribe to browse mode - stack uses this to trigger camera fit
  const isBrowsing = useBrowseModeStore((state) => state.isActive)

  // Get flattened content and category info
  const flattenedContent = useFlattenedContent()
  const { items, hasContent } = flattenedContent

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

  // Calculate max deck depth (zfront) for bounding box
  const maxItemsInDeck = useMemo(() => {
    let max = 0
    itemsPerCategory.forEach((items) => {
      if (items.length > max) max = items.length
    })
    return max
  }, [itemsPerCategory])

  const maxDeckDepth = (maxItemsInDeck - 1) * deckSpacing

  // ==========================================
  // TWO-ZONE BOUNDING BOX CALCULATIONS
  // ==========================================

  // Deck zone dimensions (where vinyl bins sit)
  const deckZoneWidth = (categoryCount - 1) * rackSpacing + deckWidth
  const deckZoneHeight = deckHeight
  const deckZoneDepth = Math.max(maxDeckDepth, 0.1) // Ensure minimum depth

  // Content zone dimensions (3x taller, stacked on top of deck zone)
  const contentZoneHeight = deckHeight * CONTENT_ZONE_MULTIPLIER

  // Combined zone for browse mode camera (4x total height)
  const combinedHeight = deckZoneHeight + contentZoneHeight

  // Content zone center (where active content should be positioned)
  const contentCenterY = floorY + deckZoneHeight + (contentZoneHeight / 2)
  const contentCenterX = 0
  const contentCenterZ = deckZoneDepth / 2

  // Combined zone center (for bounding box positioning)
  const combinedCenterY = floorY + (combinedHeight / 2)

  // Calculate the raise amount needed to get from deck position to content zone center
  const activeRaise = contentCenterY - floorY

  // Calculate rack positions (centered around origin, positioned at floor level)
  const rackPositions = useMemo(() => {
    const positions: [number, number, number][] = []
    const totalWidth = (categoryCount - 1) * rackSpacing
    const startX = -totalWidth / 2

    for (let i = 0; i < categoryCount; i++) {
      positions.push([startX + i * rackSpacing, floorY, 0])
    }

    return positions
  }, [categoryCount, rackSpacing, floorY])

  // ==========================================
  // STACK MODE CAMERA - POSITION ON MOUNT AND BROWSE ENTER
  // ==========================================
  // Stack mode always shows the "browse" view - camera fitted to combined zone
  // We position camera both on initial mount AND when browse mode is entered
  const cameraInitializedRef = useRef(false)

  // Helper to fit camera to combined bounds (browse view - see all decks)
  const fitCameraToBounds = useCallback(() => {
    const camera = useSceneStore.getState().camera
    if (!camera || !combinedBoundsRef.current || categoryCount === 0) return false

    camera.fitToBox(combinedBoundsRef.current, true, {
      paddingTop: 0.1,
      paddingBottom: 0.1,
      paddingLeft: 0.1,
      paddingRight: 0.1,
    })
    return true
  }, [categoryCount])

  // Helper to focus camera on active content (after selection)
  const focusOnActiveContent = useCallback(() => {
    const camera = useSceneStore.getState().camera
    if (!camera || categoryCount === 0) return false

    // Calculate distance to frame content nicely
    const fovRad = (50 * Math.PI) / 180
    const vFovHalf = fovRad / 2

    // Frame the content zone (where active content is displayed)
    const distanceForHeight = (contentZoneHeight / 2) / Math.tan(vFovHalf)
    const cameraDistance = distanceForHeight * 1.5 // Add padding

    camera.setLookAt(
      contentCenterX,
      contentCenterY,
      contentCenterZ + cameraDistance,
      contentCenterX,
      contentCenterY,
      contentCenterZ,
      true  // Smooth animation
    )
    return true
  }, [categoryCount, contentCenterX, contentCenterY, contentCenterZ, contentZoneHeight])

  // Initial camera position on mount (when we have content)
  useEffect(() => {
    if (categoryCount === 0 || cameraInitializedRef.current) return

    // Delay slightly to ensure mesh is rendered
    const timeoutId = setTimeout(() => {
      if (fitCameraToBounds()) {
        cameraInitializedRef.current = true
      }
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [categoryCount, fitCameraToBounds])

  // Also fit camera when browse mode is toggled ON
  useEffect(() => {
    if (!isBrowsing) return

    // Small delay to ensure state is settled
    const timeoutId = setTimeout(() => {
      fitCameraToBounds()
    }, 50)

    return () => clearTimeout(timeoutId)
  }, [isBrowsing, fitCameraToBounds])

  // Initialize active item on first render with content
  // Uses a ref to track initialization and updates content store if needed
  useEffect(() => {
    if (items.length === 0 || hasInitializedRef.current) return

    const currentActiveId = useContentStore.getState().activeItemId
    const activeItem = items.find((item) => item.contentId === currentActiveId)

    // Determine which item should be active
    const targetItem = activeItem || items[0]
    if (!targetItem) return

    // Update content store if no active item was set
    if (!activeItem) {
      useContentStore.setState({
        activeCategoryId: targetItem.categoryId,
        activeCategoryIndex: targetItem.categoryIndex,
        activeItemId: targetItem.contentId,
        activeItemData: targetItem.itemData,
        activeItemIndex: targetItem.itemIndex,
      })
    }

    // Set local active state - this is intentional initialization
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveState({
      categoryIndex: targetItem.categoryIndex,
      itemIndex: targetItem.itemIndex,
    })

    hasInitializedRef.current = true
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

  // Handle item click - make it active (content rises to content zone center)
  // Exit browse mode and re-fit camera after animation completes
  const handleItemClick = useCallback(
    (categoryIndex: number, itemIndex: number) => {
      const categoryItems = itemsPerCategory.get(categoryIndex)
      if (!categoryItems) return

      const item = categoryItems[itemIndex]
      if (!item) return

      // Update active state - old active item returns to deck, new one rises
      setActiveState({ categoryIndex, itemIndex })

      // Update content store
      useContentStore.setState({
        activeCategoryId: item.categoryId,
        activeCategoryIndex: item.categoryIndex,
        activeItemId: item.contentId,
        activeItemData: item.itemData,
        activeItemIndex: item.itemIndex,
      })

      // Exit browse mode
      if (useBrowseModeStore.getState().isActive) {
        useBrowseModeStore.getState().exitBrowseMode(false)
      }

      // Focus camera on active content after animation completes (~500ms for spring animation)
      setTimeout(() => {
        focusOnActiveContent()
      }, 500)
    },
    [itemsPerCategory, focusOnActiveContent]
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
    <group ref={sceneGroupRef}>
      {/* Combined bounding box for fitToBox camera positioning */}
      <mesh
        ref={combinedBoundsRef}
        position={[contentCenterX, combinedCenterY, contentCenterZ]}
        visible={false}
      >
        <boxGeometry args={[deckZoneWidth, combinedHeight, deckZoneDepth]} />
        <meshBasicMaterial color="cyan" wireframe transparent opacity={0.2} />
      </mesh>

      {/* Debug visualization of zones */}
      {debug && (
        <>
          {/* Deck zone (bottom) */}
          <mesh
            position={[contentCenterX, floorY + deckZoneHeight / 2, contentCenterZ]}
          >
            <boxGeometry args={[deckZoneWidth, deckZoneHeight, deckZoneDepth]} />
            <meshBasicMaterial color="orange" wireframe transparent opacity={0.3} />
          </mesh>
          {/* Content zone (top) */}
          <mesh
            position={[contentCenterX, contentCenterY, contentCenterZ]}
          >
            <boxGeometry args={[deckZoneWidth, contentZoneHeight, deckZoneDepth]} />
            <meshBasicMaterial color="cyan" wireframe transparent opacity={0.3} />
          </mesh>
        </>
      )}

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
                disablePointerEvents={true}
              />
            ))}
          </Deck>
        )
      })}
    </group>
  )
}

export default StackScene
