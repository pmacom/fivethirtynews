import { CloudOrganizationMode } from '../../core/store/cloudViewStore'

export type Position3D = [number, number, number]

export interface CloudItem {
  id: string
  categoryId: string
  categoryIndex: number
  itemIndex: number
}

// Seeded random for consistent positioning
const seededRandom = (seed: number): number => {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

/**
 * Random cloud - items scattered on sphere surface
 */
export function calculateRandomPositions(
  items: CloudItem[],
  radius: number = 8
): Position3D[] {
  return items.map((_, i) => {
    const seed = i * 12345
    const theta = seededRandom(seed) * Math.PI * 2
    const phi = Math.acos(2 * seededRandom(seed + 1) - 1)
    const r = radius * Math.cbrt(seededRandom(seed + 2))

    return [
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi),
    ] as Position3D
  })
}

/**
 * Clustered - items grouped by category with spacing between clusters
 */
export function calculateClusteredPositions(
  items: CloudItem[],
  categories: string[],
  clusterRadius: number = 3,
  clusterSpacing: number = 8
): Position3D[] {
  const categoryCount = categories.length
  const positions: Position3D[] = []

  // Position each category cluster around a circle
  const categoryAngles = categories.map((_, i) => (i / categoryCount) * Math.PI * 2)

  // Group items by category
  const itemsByCategory = new Map<string, CloudItem[]>()
  items.forEach((item) => {
    const existing = itemsByCategory.get(item.categoryId) || []
    existing.push(item)
    itemsByCategory.set(item.categoryId, existing)
  })

  // Calculate positions for each item
  items.forEach((item) => {
    const categoryIdx = categories.indexOf(item.categoryId)
    if (categoryIdx === -1) {
      positions.push([0, 0, 0])
      return
    }

    const angle = categoryAngles[categoryIdx]
    const clusterCenter: Position3D = [
      Math.cos(angle) * clusterSpacing,
      0,
      Math.sin(angle) * clusterSpacing,
    ]

    // Position within cluster using spherical distribution
    const categoryItems = itemsByCategory.get(item.categoryId) || []
    const indexInCategory = categoryItems.indexOf(item)
    const seed = indexInCategory * 54321

    const theta = seededRandom(seed) * Math.PI * 2
    const phi = Math.acos(2 * seededRandom(seed + 1) - 1)
    const r = clusterRadius * Math.cbrt(seededRandom(seed + 2))

    positions.push([
      clusterCenter[0] + r * Math.sin(phi) * Math.cos(theta),
      clusterCenter[1] + r * Math.sin(phi) * Math.sin(theta),
      clusterCenter[2] + r * Math.cos(phi),
    ])
  })

  return positions
}

/**
 * Grid - items arranged in 3D grid with rows, columns, and depth layers
 */
export function calculateGridPositions(
  items: CloudItem[],
  itemsPerRow: number = 5,
  rowsPerLayer: number = 4,
  spacing: number = 2
): Position3D[] {
  return items.map((_, i) => {
    const col = i % itemsPerRow
    const row = Math.floor(i / itemsPerRow) % rowsPerLayer
    const layer = Math.floor(i / (itemsPerRow * rowsPerLayer))

    // Center the grid
    const xOffset = ((itemsPerRow - 1) * spacing) / 2
    const yOffset = ((rowsPerLayer - 1) * spacing) / 2

    return [
      col * spacing - xOffset,
      row * spacing - yOffset,
      -layer * spacing * 1.5, // Layers go back into the scene
    ] as Position3D
  })
}

/**
 * Spiral/Helix - items arranged along a spiral path
 */
export function calculateSpiralPositions(
  items: CloudItem[],
  radius: number = 5,
  heightPerTurn: number = 3,
  itemsPerTurn: number = 8
): Position3D[] {
  return items.map((_, i) => {
    // Angle increases with each item
    const angle = (i / itemsPerTurn) * Math.PI * 2
    // Height increases linearly
    const height = (i / itemsPerTurn) * heightPerTurn
    // Slight radius variation for visual interest
    const r = radius * (0.8 + 0.4 * Math.sin(i * 0.3))

    // Center the spiral vertically
    const totalHeight = (items.length / itemsPerTurn) * heightPerTurn
    const yOffset = totalHeight / 2

    return [
      Math.cos(angle) * r,
      height - yOffset,
      Math.sin(angle) * r,
    ] as Position3D
  })
}

/**
 * Main function to calculate positions based on organization mode
 */
export function calculatePositions(
  items: CloudItem[],
  categories: string[],
  mode: CloudOrganizationMode
): Position3D[] {
  switch (mode) {
    case 'clustered':
      return calculateClusteredPositions(items, categories)
    case 'grid':
      return calculateGridPositions(items)
    case 'spiral':
      return calculateSpiralPositions(items)
    case 'random':
    default:
      return calculateRandomPositions(items)
  }
}

export default calculatePositions
