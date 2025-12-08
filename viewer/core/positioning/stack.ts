import { Positioner, PositionerConfig, ItemTransform, GroupTransform, AnimationConfig } from './types'

// Stack positioning constants
const VERTICAL_OFFSET = 0.15
const DEPTH_OFFSET = 0.08
const HORIZONTAL_FAN = 0.02
const TILT_FACTOR = 0.03
const BASE_TILT = 0.1 // Slight tilt for the whole stack

/**
 * Stack Positioner
 * Items stacked vertically with slight depth and horizontal offset.
 * Creates a "deck of cards" effect.
 */
export const stackPositioner: Positioner = {
  name: 'stack',

  getItemTransform(globalIndex: number, config: PositionerConfig): ItemTransform {
    const { activeGlobalIndex } = config

    // Stack position relative to active item
    const stackPosition = globalIndex - activeGlobalIndex

    // Vertical stacking
    const y = stackPosition * -VERTICAL_OFFSET

    // Depth stacking (items behind are further back)
    const z = stackPosition * -DEPTH_OFFSET

    // Slight horizontal fan
    const x = stackPosition * HORIZONTAL_FAN

    // Tilt increases for items further in stack
    const tiltX = stackPosition * TILT_FACTOR

    return {
      position: [x, y, z],
      rotation: [tiltX, 0, 0],
      scale: 1,
    }
  },

  getGroupTransform(config: PositionerConfig): GroupTransform {
    const { activeGlobalIndex } = config

    // Move stack so active item is centered
    const positionY = activeGlobalIndex * VERTICAL_OFFSET

    return {
      position: [0, positionY, 0],
      rotation: [BASE_TILT, 0, 0],
      scale: 1,
    }
  },

  getAnimationConfig(): AnimationConfig {
    return {
      tension: 200,
      friction: 25,
    }
  },
}

export default stackPositioner
