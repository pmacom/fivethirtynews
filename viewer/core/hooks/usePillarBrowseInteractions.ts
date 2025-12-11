'use client'

import { useCallback, useRef, useEffect } from 'react'
import { useBrowseModeStore } from '../store/browseModeStore'
import { useContentStore } from '../store/contentStore'
import { useViewModeStore } from '../store/viewModeStore'
import { useSceneStore } from '../../scene/store'

interface DragState {
  isDragging: boolean
  startX: number
  startY: number
  lastX: number
  lastY: number
}

// Sensitivity for controls
const ANGLE_SENSITIVITY = 0.005   // radians per pixel of horizontal drag
const HEIGHT_SENSITIVITY = 0.02  // units per pixel of vertical drag
const SCROLL_HEIGHT_SENSITIVITY = 0.02  // units per wheel delta pixel
const SCROLL_ANGLE_SENSITIVITY = 0.002  // radians per horizontal wheel delta

// Padding for height bounds (allows slight overshoot for visual comfort)
const HEIGHT_PADDING = 1.0

/**
 * Calculate the pillar radius based on viewport aspect ratio
 * (Same formula as in pillar.ts positioner)
 */
function calculatePillarRadius(canvasWidth: number, canvasHeight: number, numColumns: number): number {
  if (numColumns === 0) return 1
  const viewportAspect = canvasWidth / canvasHeight
  const planeWidth = 1.0 * viewportAspect
  const halfWidth = planeWidth / 2
  return halfWidth / Math.sin(Math.PI / numColumns)
}

/**
 * Calculate the maximum height of the pillar (tallest category)
 */
function calculatePillarMaxHeight(content: any[]): number {
  if (content.length === 0) return 0

  // Find the category with the most items
  let maxItems = 0
  for (const category of content) {
    const itemCount = category.content_block_items?.length || 0
    if (itemCount > maxItems) {
      maxItems = itemCount
    }
  }

  // Height is 0-indexed, so max height = maxItems - 1
  return Math.max(0, maxItems - 1)
}

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Hook that handles pillar-specific browse interactions:
 * - Horizontal drag: Orbit camera around pillar
 * - Vertical drag: Move camera up/down (climb/descend)
 * - Scroll wheel (vertical): Climb/descend the pillar
 * - Scroll wheel (horizontal): Rotate around pillar
 *
 * Height is clamped to pillar bounds to prevent getting lost.
 */
export function usePillarBrowseInteractions() {
  const dragState = useRef<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
  })

  const isBrowseMode = useBrowseModeStore(state => state.isActive)
  const viewMode = useViewModeStore(state => state.viewMode)

  /**
   * Apply camera position based on pillar camera state
   */
  const applyCameraPosition = useCallback((angle: number, height: number, radius: number, smooth: boolean = false) => {
    const camera = useSceneStore.getState().camera
    if (!camera) return

    // Calculate camera position on orbit
    const x = radius * Math.cos(angle)
    const z = radius * Math.sin(angle)

    // Camera looks at pillar center at same height
    camera.setLookAt(x, height, z, 0, height, 0, smooth)
  }, [])

  /**
   * Initialize pillar browse mode - set camera to overview position
   */
  const initPillarBrowse = useCallback(() => {
    const { canvasWidth, canvasHeight } = useSceneStore.getState()
    const { content, activeCategoryIndex, activeItemIndex } = useContentStore.getState()
    const numColumns = content.length

    if (numColumns === 0) return

    // Calculate pillar radius
    const pillarRadius = calculatePillarRadius(canvasWidth, canvasHeight, numColumns)

    // Camera orbit radius = pillar radius * multiplier for overview
    const orbitRadius = pillarRadius * 2.5

    // Initial angle facing the active category
    const angleStep = (2 * Math.PI) / numColumns
    const initialAngle = activeCategoryIndex * angleStep + Math.PI / 2

    // Height at active item
    const initialHeight = activeItemIndex

    // Calculate height bounds
    const maxPillarHeight = calculatePillarMaxHeight(content)
    const minHeight = -HEIGHT_PADDING  // Allow slight undershoot
    const maxHeight = maxPillarHeight + HEIGHT_PADDING  // Allow slight overshoot

    // Store state with bounds
    useBrowseModeStore.getState().initPillarBrowse(
      orbitRadius,
      initialAngle,
      initialHeight,
      minHeight,
      maxHeight
    )

    // Apply initial camera position with smooth transition
    applyCameraPosition(initialAngle, initialHeight, orbitRadius, true)
  }, [applyCameraPosition])

  // Initialize camera when entering pillar browse mode
  useEffect(() => {
    if (isBrowseMode && viewMode === 'pillar') {
      // Small delay to ensure camera is ready
      const timer = setTimeout(() => {
        initPillarBrowse()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isBrowseMode, viewMode, initPillarBrowse])

  // Mouse/touch handlers
  const handlePointerDown = useCallback((e: PointerEvent) => {
    if (!isBrowseMode || viewMode !== 'pillar') return

    dragState.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
    }
  }, [isBrowseMode, viewMode])

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!dragState.current.isDragging) return
    if (!isBrowseMode || viewMode !== 'pillar') return

    const { pillarCameraState, setPillarCameraState } = useBrowseModeStore.getState()
    if (!pillarCameraState) return

    const deltaX = e.clientX - dragState.current.lastX
    const deltaY = e.clientY - dragState.current.lastY

    // Horizontal drag → rotate camera around pillar
    const newAngle = pillarCameraState.angle - deltaX * ANGLE_SENSITIVITY

    // Vertical drag → move camera up/down (clamped to bounds)
    const rawHeight = pillarCameraState.height - deltaY * HEIGHT_SENSITIVITY
    const newHeight = clamp(rawHeight, pillarCameraState.minHeight, pillarCameraState.maxHeight)

    // Update state
    setPillarCameraState({
      ...pillarCameraState,
      angle: newAngle,
      height: newHeight,
    })

    // Apply to camera immediately (no smooth for responsiveness)
    applyCameraPosition(newAngle, newHeight, pillarCameraState.radius, false)

    dragState.current.lastX = e.clientX
    dragState.current.lastY = e.clientY
  }, [isBrowseMode, viewMode, applyCameraPosition])

  const handlePointerUp = useCallback(() => {
    dragState.current.isDragging = false
  }, [])

  // Wheel handler - vertical scroll climbs/descends, horizontal scroll rotates
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!isBrowseMode || viewMode !== 'pillar') return

    // Prevent default scroll behavior
    e.preventDefault()

    const { pillarCameraState, setPillarCameraState } = useBrowseModeStore.getState()
    if (!pillarCameraState) return

    let newAngle = pillarCameraState.angle
    let newHeight = pillarCameraState.height

    // Vertical scroll → climb/descend (scroll down = go down, scroll up = go up)
    if (Math.abs(e.deltaY) > 0) {
      const rawHeight = pillarCameraState.height + e.deltaY * SCROLL_HEIGHT_SENSITIVITY
      newHeight = clamp(rawHeight, pillarCameraState.minHeight, pillarCameraState.maxHeight)
    }

    // Horizontal scroll → rotate around pillar
    if (Math.abs(e.deltaX) > 0) {
      newAngle = pillarCameraState.angle - e.deltaX * SCROLL_ANGLE_SENSITIVITY
    }

    setPillarCameraState({
      ...pillarCameraState,
      angle: newAngle,
      height: newHeight,
    })

    applyCameraPosition(newAngle, newHeight, pillarCameraState.radius, false)
  }, [isBrowseMode, viewMode, applyCameraPosition])

  // Attach event listeners
  useEffect(() => {
    if (!isBrowseMode || viewMode !== 'pillar') return

    const canvas = document.querySelector('canvas')
    if (!canvas) return

    canvas.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('wheel', handleWheel)
    }
  }, [isBrowseMode, viewMode, handlePointerDown, handlePointerMove, handlePointerUp, handleWheel])

  return {
    initPillarBrowse,
    applyCameraPosition,
  }
}

export default usePillarBrowseInteractions
