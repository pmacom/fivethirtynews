import { easePolyInOut } from 'd3-ease'
import { Positioner, PositionerConfig, ItemTransform, GroupTransform, AnimationConfig } from './types'

const ANGLE_OFFSET = Math.PI / 2 // Initial alignment offset

/**
 * Calculate the radius of the pillar based on viewport aspect ratio
 * This ensures planes touch but don't overlap
 */
function calculateRadius(canvasWidth: number, canvasHeight: number, numColumns: number): number {
  if (numColumns === 0) return 0
  const viewportAspect = canvasWidth / canvasHeight
  const planeWidth = 1.0 * viewportAspect // matches PlaneView sizing
  const halfWidth = planeWidth / 2
  return halfWidth / Math.sin(Math.PI / numColumns)
}

/**
 * Calculate the angle step between columns
 */
function calculateAngleStep(numColumns: number): number {
  if (numColumns === 0) return 0
  return (2 * Math.PI) / numColumns
}

/**
 * Get the category index for a given item
 */
function getCategoryForItem(globalIndex: number, config: PositionerConfig): number {
  const item = config.items[globalIndex]
  return item?.categoryIndex ?? 0
}

/**
 * Get the item index within its category
 */
function getItemIndexInCategory(globalIndex: number, config: PositionerConfig): number {
  const item = config.items[globalIndex]
  return item?.itemIndex ?? 0
}

/**
 * Pillar Positioner
 * Items arranged in vertical columns positioned around a circle.
 * The entire pillar rotates to face the active category toward the camera.
 */
export const pillarPositioner: Positioner = {
  name: 'pillar',

  getItemTransform(globalIndex: number, config: PositionerConfig): ItemTransform {
    const { canvasWidth, canvasHeight, categories } = config
    const numColumns = categories.length

    if (numColumns === 0) {
      return { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 }
    }

    const radius = calculateRadius(canvasWidth, canvasHeight, numColumns)
    const angleStep = calculateAngleStep(numColumns)

    // Get which category (column) this item belongs to
    const categoryIndex = getCategoryForItem(globalIndex, config)
    const itemIndexInCategory = getItemIndexInCategory(globalIndex, config)

    // Calculate column position around the circle
    const angle = categoryIndex * angleStep
    const x = radius * Math.cos(angle)
    const z = radius * Math.sin(angle)

    // Items stack vertically within their column
    const y = itemIndexInCategory

    // Rotate column to face outward
    const columnRotationY = -angle + Math.PI - Math.PI / 2

    return {
      position: [x, y, z],
      rotation: [0, columnRotationY, 0],
      scale: 1,
    }
  },

  getGroupTransform(config: PositionerConfig): GroupTransform {
    const { categories, activeCategoryIndex, activeItemIndex } = config
    const numColumns = categories.length

    if (numColumns === 0) {
      return { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 }
    }

    const angleStep = calculateAngleStep(numColumns)

    // Calculate rotation to bring active category to front
    const selectedPlaneAngle = activeCategoryIndex * angleStep
    const rotationY = selectedPlaneAngle - ANGLE_OFFSET

    // Translate vertically to center active item
    const positionY = -activeItemIndex

    return {
      position: [0, positionY, 0],
      rotation: [0, rotationY, 0],
      scale: 1,
    }
  },

  getAnimationConfig(): AnimationConfig {
    return {
      duration: 2000,
      easing: easePolyInOut,
    }
  },
}

export default pillarPositioner
