import { LiveViewContentBlock, LiveViewContentBlockItems } from '../content/types'

// 3D position/rotation types
export type Position3D = [number, number, number]
export type Rotation3D = [number, number, number]

// Transform for individual items
export interface ItemTransform {
  position: Position3D
  rotation: Rotation3D
  scale: number
}

// Transform for the entire group (for animations)
export interface GroupTransform {
  position: Position3D
  rotation: Rotation3D
  scale: number
}

// Flattened item with all metadata needed for positioning
export interface FlattenedItem {
  id: string
  itemData: LiveViewContentBlockItems
  categoryId: string
  categoryIndex: number
  itemIndex: number
  globalIndex: number
}

// Configuration passed to positioner functions
export interface PositionerConfig {
  items: FlattenedItem[]
  categories: LiveViewContentBlock[]
  activeGlobalIndex: number
  activeCategoryIndex: number
  activeItemIndex: number
  canvasWidth: number
  canvasHeight: number
  options?: Record<string, any>
}

// Animation configuration for react-spring
export interface AnimationConfig {
  duration?: number
  easing?: (t: number) => number
  tension?: number
  friction?: number
}

// The main Positioner interface - pure functions for computing transforms
export interface Positioner {
  name: string

  // Get transform for a single item
  getItemTransform(globalIndex: number, config: PositionerConfig): ItemTransform

  // Get transform for the entire group (used for animations like rotation/translation)
  getGroupTransform(config: PositionerConfig): GroupTransform

  // Get animation config for this positioner
  getAnimationConfig(): AnimationConfig

  // Optional: check if item should be visible (for culling/optimization)
  isItemVisible?(globalIndex: number, config: PositionerConfig): boolean
}

// Hover animation config for layouts that support it (like Stack)
export interface HoverAnimation {
  liftY?: number
  liftZ?: number
  tiltX?: number
  scale?: number
}

// Props for the unified ContentScene component
export interface ContentSceneProps {
  positioner: Positioner
  positionerOptions?: Record<string, any>
  itemHoverAnimation?: HoverAnimation
  enableNavigation?: boolean
  enableWheelZoom?: boolean
}

// Props for the unified ContentItem component
export interface ContentItemProps {
  item: FlattenedItem
  transform: ItemTransform
  isActive: boolean
  isHovered: boolean
  hoverAnimation?: HoverAnimation
  onSelect: (item: FlattenedItem) => void
  onHover: (item: FlattenedItem | null) => void
}
