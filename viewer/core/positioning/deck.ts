import { Positioner, PositionerConfig, ItemTransform, GroupTransform, AnimationConfig } from './types'

// Deck positioning constants (based on ContentDeck logic)
const Z_SPACING = 0.2        // Space between items along Z-axis
const RAISE_AMOUNT = 0.5     // How much selected item raises on Y-axis
const HORIZONTAL_FAN = 0.02  // Slight horizontal spread
const TILT_FACTOR = 0.03     // Progressive tilt for items in stack

/**
 * Deck Positioner
 * Items arranged along Z-axis like a deck of cards spread out.
 * Selection is determined by pointer position over the deck area.
 *
 * Key differences from Stack:
 * - Items spread along Z-axis (depth) instead of Y-axis (vertical)
 * - Pointer-based selection via hit geometry (handled by DeckScene)
 * - Selected item raises up rather than coming forward
 */
export const deckPositioner: Positioner = {
  name: 'deck',

  getItemTransform(globalIndex: number, config: PositionerConfig): ItemTransform {
    const { activeGlobalIndex, options } = config
    const isSelected = globalIndex === activeGlobalIndex
    const raiseAmount = options?.raiseAmount ?? RAISE_AMOUNT

    // Z-position: items spread along depth axis
    const z = globalIndex * Z_SPACING

    // Y-position: selected item raises up
    const y = isSelected ? raiseAmount : 0

    // Slight horizontal fan for visual interest
    const x = globalIndex * HORIZONTAL_FAN

    // Progressive tilt - items further back tilt more
    const tiltX = globalIndex * TILT_FACTOR

    return {
      position: [x, y, z],
      rotation: [tiltX, 0, 0],
      scale: 1,
    }
  },

  getGroupTransform(config: PositionerConfig): GroupTransform {
    const { items, activeGlobalIndex } = config
    const totalItems = items.length

    // Center the deck so active item is roughly centered
    // Move group back so the deck extends from front to back
    const centerZ = ((totalItems - 1) * Z_SPACING) / 2
    const activeZ = activeGlobalIndex * Z_SPACING

    return {
      position: [0, 0, -activeZ + centerZ * 0.5],
      rotation: [0, 0, 0],
      scale: 1,
    }
  },

  getAnimationConfig(): AnimationConfig {
    return {
      tension: 200,
      friction: 25,
    }
  },

  // Deck uses flat navigation
  navigationMode: 'flat',
}

// Utility functions for deck geometry calculations

/**
 * Calculate the Z-depth of the deck based on item count
 */
export function getDeckDepth(itemCount: number): number {
  return Math.max(0, (itemCount - 1) * Z_SPACING)
}

/**
 * Calculate which item index corresponds to a Z position within the deck
 */
export function getItemIndexFromZ(z: number, itemCount: number): number {
  if (itemCount <= 1) return 0
  const deckDepth = getDeckDepth(itemCount)
  const fraction = Math.max(0, Math.min(1, z / deckDepth))
  return Math.round((itemCount - 1) * fraction)
}

/**
 * Get the deck geometry points for creating the hit mesh
 * Returns vertices for a shaped interaction area
 */
export interface DeckPoints {
  // Back corners (furthest from camera)
  btl: [number, number, number]  // back top left
  btr: [number, number, number]  // back top right
  bbl: [number, number, number]  // back bottom left
  bbr: [number, number, number]  // back bottom right
  // Front corners (closest to camera)
  ftl: [number, number, number]  // front top left
  ftr: [number, number, number]  // front top right
  fbl: [number, number, number]  // front bottom left
  fbr: [number, number, number]  // front bottom right
  // Front middle (for angled entry)
  fml: [number, number, number]  // front middle left
  fmr: [number, number, number]  // front middle right
  // Edge points (for the lip/edge of deck)
  efl: [number, number, number]  // edge front left
  efr: [number, number, number]  // edge front right
  ebl: [number, number, number]  // edge back left
  ebr: [number, number, number]  // edge back right
}

export function getDeckPoints(
  width: number,
  height: number,
  depth: number,
  offset: number = 0.5,
  edgeSize: number = 0.3
): DeckPoints {
  const halfWidth = width / 2
  const halfHeight = height / 2

  // Geometry is built with:
  // - "Back" (z=depth) is furthest from camera - this is where the LIP/angle is
  // - "Front" (z=0) is closest to camera - this is the flat entry point
  // Items are positioned from z=0 (index 0) to z=depth (last index)
  // Camera looks from +Z toward -Z (or from high Z toward low Z)

  return {
    // Back plane (z = depth) - has the raised lip/angle for browsing
    btl: [-halfWidth, halfHeight + offset, depth],
    btr: [halfWidth, halfHeight + offset, depth],
    bbl: [-halfWidth, -halfHeight, depth],
    bbr: [halfWidth, -halfHeight, depth],
    // Front plane (z = 0) - flat entry point closest to camera
    ftl: [-halfWidth, halfHeight, 0],
    ftr: [halfWidth, halfHeight, 0],
    fbl: [-halfWidth, -halfHeight, 0],
    fbr: [halfWidth, -halfHeight, 0],
    // Back middle (for angled section at the back)
    fml: [-halfWidth, halfHeight * offset, depth],
    fmr: [halfWidth, halfHeight * offset, depth],
    // Edges - extend at the back where the lip is
    efl: [-halfWidth - edgeSize, halfHeight, depth],
    efr: [halfWidth + edgeSize, halfHeight, depth],
    ebl: [-halfWidth - edgeSize, halfHeight, 0],
    ebr: [halfWidth + edgeSize, halfHeight, 0],
  }
}

export default deckPositioner
