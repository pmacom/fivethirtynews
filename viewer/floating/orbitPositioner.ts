/**
 * Orbit positioning utilities for floating content items.
 * Items orbit around the currently active content in 3D space.
 */

export type Position3D = [number, number, number]

export interface OrbitConfig {
  /** Distance from center (default: 2.5) */
  radius: number
  /** Rotation speed in rad/sec (default: 0.2) */
  speed: number
  /** Vertical bobbing amplitude (default: 0.2) */
  bobAmplitude: number
  /** Vertical bobbing speed (default: 0.4) */
  bobSpeed: number
  /** Tilt of the orbit plane in radians (default: 0.3) */
  tilt: number
}

const DEFAULT_CONFIG: OrbitConfig = {
  radius: 2.5,
  speed: 0.2,
  bobAmplitude: 0.2,
  bobSpeed: 0.4,
  tilt: 0.3,
}

/**
 * Calculate the orbit position for an item at a given time.
 * Items are evenly distributed around a circle and rotate over time.
 *
 * @param index - Index of this item in the orbit (0, 1, 2, ...)
 * @param total - Total number of items in orbit
 * @param time - Current time in seconds (for animation)
 * @param config - Optional orbit configuration
 * @returns [x, y, z] position relative to center
 */
export function getOrbitPosition(
  index: number,
  total: number,
  time: number,
  config: Partial<OrbitConfig> = {}
): Position3D {
  const { radius, speed, bobAmplitude, bobSpeed, tilt } = { ...DEFAULT_CONFIG, ...config }

  // Base angle: evenly distribute items around the circle
  const baseAngle = (index / Math.max(total, 1)) * Math.PI * 2

  // Current angle: rotate over time (all items rotate together)
  const currentAngle = baseAngle + time * speed

  // Horizontal position on the orbit circle
  const x = Math.cos(currentAngle) * radius
  const z = Math.sin(currentAngle) * radius

  // Vertical position: slight tilt + bobbing for organic feel
  const tiltOffset = Math.sin(currentAngle) * tilt * radius * 0.3
  const bobOffset = Math.sin(time * bobSpeed + index * 1.5) * bobAmplitude

  const y = tiltOffset + bobOffset

  return [x, y, z]
}

/**
 * Calculate the entry animation position.
 * Items start from outside the orbit and animate in.
 *
 * @param index - Index of this item
 * @param total - Total number of items
 * @param progress - Animation progress (0 = start, 1 = end)
 * @param config - Optional orbit configuration
 * @returns [x, y, z] position during entry animation
 */
export function getEntryPosition(
  index: number,
  total: number,
  progress: number,
  config: Partial<OrbitConfig> = {}
): Position3D {
  const { radius } = { ...DEFAULT_CONFIG, ...config }

  // Target position (where we're animating TO)
  const targetPos = getOrbitPosition(index, total, 0, config)

  // Start position: further out and above
  const entryRadius = radius * 2.5
  const entryHeight = 1.5

  const baseAngle = (index / Math.max(total, 1)) * Math.PI * 2

  const startPos: Position3D = [
    Math.cos(baseAngle) * entryRadius,
    entryHeight,
    Math.sin(baseAngle) * entryRadius,
  ]

  // Ease-out cubic for smooth deceleration
  const eased = 1 - Math.pow(1 - progress, 3)

  // Lerp from start to target
  return [
    startPos[0] + (targetPos[0] - startPos[0]) * eased,
    startPos[1] + (targetPos[1] - startPos[1]) * eased,
    startPos[2] + (targetPos[2] - startPos[2]) * eased,
  ]
}

/**
 * Calculate look-at rotation for a floating item.
 * Items should face toward the center (or slightly toward camera).
 *
 * @param position - Current position of the item
 * @returns [rotationX, rotationY, rotationZ] in radians
 */
export function getOrbitRotation(position: Position3D): Position3D {
  const [x, , z] = position

  // Rotate to face center (opposite of position angle)
  const angle = Math.atan2(z, x)

  // Add slight tilt back toward camera
  return [0, -angle + Math.PI, 0]
}

/**
 * Get orbit configuration scaled by number of items.
 * More items = larger orbit radius.
 *
 * @param itemCount - Number of items in orbit
 * @returns Scaled orbit configuration
 */
export function getScaledConfig(itemCount: number): Partial<OrbitConfig> {
  // Scale radius based on item count to prevent overlap
  const baseRadius = 2.5
  const radiusPerItem = 0.3
  const radius = baseRadius + Math.max(0, itemCount - 3) * radiusPerItem

  // Slow down rotation with more items
  const speed = Math.max(0.1, 0.25 - itemCount * 0.02)

  return { radius, speed }
}

export default {
  getOrbitPosition,
  getEntryPosition,
  getOrbitRotation,
  getScaledConfig,
}
