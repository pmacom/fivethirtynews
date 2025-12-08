import { Positioner, PositionerConfig, ItemTransform, GroupTransform, AnimationConfig, Position3D } from './types'
import {
  calculateRandomPositions,
  calculateClusteredPositions,
  calculateGridPositions,
  calculateSpiralPositions,
  CloudItem,
} from '../../layouts/cloud/positioners'

export type CloudOrganizationMode = 'random' | 'clustered' | 'grid' | 'spiral'

// Convert FlattenedItem to CloudItem for the existing algorithms
function toCloudItems(config: PositionerConfig): CloudItem[] {
  return config.items.map(item => ({
    id: item.id,
    categoryId: item.categoryId,
    categoryIndex: item.categoryIndex,
    itemIndex: item.itemIndex,
  }))
}

// Calculate positions using the existing algorithms
function calculateCloudPositions(config: PositionerConfig): Position3D[] {
  const cloudItems = toCloudItems(config)
  const categoryIds = config.categories.map(c => c.id)
  const mode = (config.options?.organizationMode || 'random') as CloudOrganizationMode

  switch (mode) {
    case 'clustered':
      return calculateClusteredPositions(cloudItems, categoryIds) as Position3D[]
    case 'grid':
      return calculateGridPositions(cloudItems) as Position3D[]
    case 'spiral':
      return calculateSpiralPositions(cloudItems) as Position3D[]
    case 'random':
    default:
      return calculateRandomPositions(cloudItems) as Position3D[]
  }
}

// Cache for positions to avoid recalculating on every render
let cachedPositions: Position3D[] = []
let cachedItemCount = 0
let cachedMode: CloudOrganizationMode | null = null

/**
 * Cloud Positioner
 * Items scattered in 3D space with multiple organization modes.
 * Group translates to center the active item when focused.
 */
export const cloudPositioner: Positioner = {
  name: 'cloud',

  getItemTransform(globalIndex: number, config: PositionerConfig): ItemTransform {
    const mode = (config.options?.organizationMode || 'random') as CloudOrganizationMode

    // Recalculate positions if items changed or mode changed
    if (config.items.length !== cachedItemCount || mode !== cachedMode) {
      cachedPositions = calculateCloudPositions(config)
      cachedItemCount = config.items.length
      cachedMode = mode
    }

    const position = cachedPositions[globalIndex] || [0, 0, 0]

    return {
      position,
      rotation: [0, 0, 0],
      scale: 1,
    }
  },

  getGroupTransform(config: PositionerConfig): GroupTransform {
    const { activeGlobalIndex, options } = config
    const zoomLevel = options?.zoomLevel || 'distant'

    // In focused mode, translate so active item is at origin
    if (zoomLevel === 'focused' && activeGlobalIndex >= 0 && cachedPositions[activeGlobalIndex]) {
      const activePos = cachedPositions[activeGlobalIndex]
      return {
        position: [-activePos[0], -activePos[1], -activePos[2]],
        rotation: [0, 0, 0],
        scale: 1.5,
      }
    }

    // Distant mode - show full cloud
    return {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: 1,
    }
  },

  getAnimationConfig(): AnimationConfig {
    return {
      tension: 200,
      friction: 30,
    }
  },
}

export default cloudPositioner
