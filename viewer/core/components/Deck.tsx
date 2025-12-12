"use client"

import React, {
  ReactElement,
  useMemo,
  useCallback,
  useRef,
  useState,
  Children,
  isValidElement,
} from 'react'
import * as THREE from 'three'
import { ThreeEvent } from '@react-three/fiber'
import { useSpring, animated, config } from '@react-spring/three'
// Default constants
const DEFAULT_SPACING = 0.2
const DEFAULT_HOVER_RAISE = 0.5      // How much item raises on hover (preview)
const DEFAULT_ACTIVE_RAISE = 2.0     // How much item raises when active (much higher)
const DEFAULT_WIDTH = 1.5
const DEFAULT_HEIGHT = 1.0

interface DeckProps {
  children: ReactElement | ReactElement[]
  spacing?: number
  hoverRaiseAmount?: number   // Raise amount for hover/preview state
  activeRaiseAmount?: number  // Raise amount for active/selected state
  activeIndex?: number | null // Externally controlled active index
  width?: number
  height?: number
  position?: [number, number, number]
  rotation?: [number, number, number]
  onHoverChange?: (index: number | null) => void
  onItemClick?: (index: number) => void
  debug?: boolean
}

/**
 * Deck - A reusable container component for "vinyl record browsing" selection
 *
 * Creates an invisible hit mesh that allows pointer-based selection of stacked items.
 * Items are spread along the Z-axis. Moving pointer over the deck area raises items
 * for preview. Clicking an item makes it "active" and raises it much higher.
 *
 * Two elevation states:
 * - **Hover/Preview**: Item raises slightly (hoverRaiseAmount) so user can see it
 * - **Active/Selected**: Item raises much higher (activeRaiseAmount) for focus
 *
 * Key features:
 * - Accepts any React elements as children
 * - Generates hit mesh based on children count
 * - Can be instantiated multiple times with different content
 * - No store dependencies (pure props-based)
 * - Supports external active state control via activeIndex prop
 *
 * @example
 * <Deck
 *   activeIndex={activeIdx}
 *   onHoverChange={(idx) => setHovered(idx)}
 *   onItemClick={(idx) => setActive(idx)}
 * >
 *   <ContentCard data={item1} />
 *   <ContentCard data={item2} />
 * </Deck>
 */
export function Deck({
  children,
  spacing = DEFAULT_SPACING,
  hoverRaiseAmount = DEFAULT_HOVER_RAISE,
  activeRaiseAmount = DEFAULT_ACTIVE_RAISE,
  activeIndex = null,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  onHoverChange,
  onItemClick,
  debug = false,
}: DeckProps) {
  const pointRef = useRef<THREE.Mesh>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Convert children to array
  const childArray = useMemo(() => {
    return Children.toArray(children).filter(isValidElement) as ReactElement[]
  }, [children])

  const itemCount = childArray.length

  // Calculate deck depth based on item count and spacing
  // This is "zfront" in the original - the Z position of the frontmost item
  const zfront = useMemo(() => {
    return (itemCount - 1) * spacing
  }, [itemCount, spacing])

  // Create hit geometry matching original Tweet3d implementation exactly
  // Back (z=0) is where camera looks from, Front (z=zfront) is where items extend to
  const hitGeometry = useMemo(() => {
    if (itemCount < 2) return null

    const halfWidth = width / 2
    const halfHeight = height / 2

    // Vertex positions - exactly matching original Tweet3d
    // Back plane (z=0) - closest to camera
    const btr: [number, number, number] = [halfWidth, halfHeight, 0]
    const bbr: [number, number, number] = [halfWidth, -halfHeight, 0]
    const bbl: [number, number, number] = [-halfWidth, -halfHeight, 0]
    const btl: [number, number, number] = [-halfWidth, halfHeight, 0]
    // Front plane (z=zfront) - where items extend to
    const ftr: [number, number, number] = [halfWidth, halfHeight, zfront]
    const fbr: [number, number, number] = [halfWidth, -halfHeight, zfront]
    const fbl: [number, number, number] = [-halfWidth, -halfHeight, zfront]
    const ftl: [number, number, number] = [-halfWidth, halfHeight, zfront]
    // Front middle points (for angled lip)
    const fmr: [number, number, number] = [halfWidth, halfHeight * 0.5, zfront]
    const fml: [number, number, number] = [-halfWidth, halfHeight * 0.5, zfront]

    const geometry = new THREE.BufferGeometry()
    const vertices = new Float32Array([
      ...btr, // 0
      ...bbr, // 1
      ...bbl, // 2
      ...btl, // 3
      ...ftr, // 4
      ...fbr, // 5
      ...fbl, // 6
      ...ftl, // 7
      ...fmr, // 8
      ...fml, // 9
    ])

    // Triangle indices - exactly matching original Tweet3d
    const indices = [
      8, 4, 0,
      0, 9, 8,
      9, 0, 3,
      8, 6, 5,
      8, 9, 6,
      3, 2, 6,
      6, 9, 3,
      1, 0, 8,
      1, 8, 5,
      3, 7, 9,
    ]

    geometry.setIndex(indices)
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.computeVertexNormals()

    return geometry
  }, [itemCount, width, height, zfront])

  // Handle pointer move over deck - hover item based on Z position
  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation()
      if (itemCount < 2) return

      // Convert hit point to local space
      const localPoint = event.eventObject.worldToLocal(event.point.clone())

      // Update debug pointer position if available
      if (pointRef.current) {
        pointRef.current.position.copy(localPoint)
      }

      // Calculate which item the pointer is over based on Z position
      // Items are at z = index * spacing, from 0 to zfront
      const fraction = zfront > 0 ? Math.max(0, Math.min(1, localPoint.z / zfront)) : 0
      const index = Math.round((itemCount - 1) * fraction)

      if (hoveredIndex !== index) {
        setHoveredIndex(index)
        onHoverChange?.(index)
      }
    },
    [itemCount, zfront, hoveredIndex, onHoverChange]
  )

  // Handle pointer leave
  const handlePointerLeave = useCallback(() => {
    setHoveredIndex(null)
    onHoverChange?.(null)
  }, [onHoverChange])

  // Handle click on deck - make hovered item active
  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation()
      if (hoveredIndex !== null) {
        onItemClick?.(hoveredIndex)
      }
    },
    [hoveredIndex, onItemClick]
  )

  return (
    <group position={position} rotation={rotation}>
      {/* Hit mesh for pointer-based selection */}
      {hitGeometry && itemCount >= 2 && (
        <mesh
          geometry={hitGeometry}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onClick={handleClick}
          visible={false}
        >
          <meshNormalMaterial side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Debug pointer indicator */}
      {debug && (
        <mesh ref={pointRef}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color="orange" />
        </mesh>
      )}

      {/* Render children with positioning and raise animation */}
      {childArray.map((child, index) => (
        <DeckItem
          key={index}
          index={index}
          spacing={spacing}
          isHovered={index === hoveredIndex}
          isActive={index === activeIndex}
          hoverRaiseAmount={hoverRaiseAmount}
          activeRaiseAmount={activeRaiseAmount}
        >
          {child}
        </DeckItem>
      ))}
    </group>
  )
}

// Internal component for individual deck items with raise animation
interface DeckItemProps {
  children: ReactElement
  index: number
  spacing: number
  isHovered: boolean
  isActive: boolean
  hoverRaiseAmount: number
  activeRaiseAmount: number
}

function DeckItem({
  children,
  index,
  spacing,
  isHovered,
  isActive,
  hoverRaiseAmount,
  activeRaiseAmount,
}: DeckItemProps) {
  // Determine raise amount based on state
  // Active takes priority over hovered
  const targetY = isActive
    ? activeRaiseAmount
    : isHovered
    ? hoverRaiseAmount
    : 0

  // Animate the raise effect
  const { y } = useSpring({
    y: targetY,
    config: isActive ? config.gentle : config.stiff,
  })

  // Position along Z-axis based on index
  const zPosition = index * spacing

  return (
    <group position={[0, 0, zPosition]}>
      <animated.group position-y={y}>{children}</animated.group>
    </group>
  )
}

export default Deck
