import { easePolyInOut } from 'd3-ease'
import { Positioner, PositionerConfig, ItemTransform, GroupTransform, AnimationConfig } from './types'

const ITEM_SPACING = 2.0

/**
 * Carousel Positioner
 * Items arranged in a simple horizontal row along the X axis.
 * Group translates to center the active item.
 */
export const carouselPositioner: Positioner = {
  name: 'carousel',

  getItemTransform(globalIndex: number, config: PositionerConfig): ItemTransform {
    return {
      position: [globalIndex * ITEM_SPACING, 0, 0],
      rotation: [0, 0, 0],
      scale: 1,
    }
  },

  getGroupTransform(config: PositionerConfig): GroupTransform {
    const { activeGlobalIndex } = config

    // Translate group horizontally to center active item
    const positionX = activeGlobalIndex >= 0 ? -activeGlobalIndex * ITEM_SPACING : 0

    return {
      position: [positionX, 0, 0],
      rotation: [0, 0, 0],
      scale: 1,
    }
  },

  getAnimationConfig(): AnimationConfig {
    return {
      duration: 1000,
      easing: easePolyInOut,
    }
  },
}

export default carouselPositioner
