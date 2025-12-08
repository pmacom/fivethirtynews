import { Position3D, Rotation3D } from './types'

/**
 * Orbit configuration for floating content items
 */
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

  // Current angle: rotate over time
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
 * Calculate look-at rotation for a floating item.
 * Items should face toward the center.
 */
export function getOrbitRotation(position: Position3D): Rotation3D {
  const [x, , z] = position
  const angle = Math.atan2(z, x)
  return [0, -angle + Math.PI, 0]
}

/**
 * Calculate entry animation position.
 * Items start from outside the orbit and animate in.
 */
export function getEntryPosition(
  index: number,
  total: number,
  progress: number,
  config: Partial<OrbitConfig> = {}
): Position3D {
  const { radius } = { ...DEFAULT_CONFIG, ...config }

  // Target position
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

  // Ease-out cubic
  const eased = 1 - Math.pow(1 - progress, 3)

  return [
    startPos[0] + (targetPos[0] - startPos[0]) * eased,
    startPos[1] + (targetPos[1] - startPos[1]) * eased,
    startPos[2] + (targetPos[2] - startPos[2]) * eased,
  ]
}

/**
 * Get orbit configuration scaled by number of items.
 * More items = larger orbit radius, slower rotation.
 */
export function getScaledConfig(itemCount: number): Partial<OrbitConfig> {
  const baseRadius = 2.5
  const radiusPerItem = 0.3
  const radius = baseRadius + Math.max(0, itemCount - 3) * radiusPerItem
  const speed = Math.max(0.1, 0.25 - itemCount * 0.02)

  return { radius, speed }
}
