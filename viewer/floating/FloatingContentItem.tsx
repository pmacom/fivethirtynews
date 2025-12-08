"use client"

import React, { useRef, useState, useEffect } from 'react'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import { useSpring, animated } from '@react-spring/three'
import * as THREE from 'three'
import PillarColumnItem from '../pillar/components/PillarColumnItem'
import { LiveViewContentBlockItems } from '../core/content/types'
import { useContentStore } from '../core/store/contentStore'
import { useFloatingContentStore } from '../core/store/floatingContentStore'
import { getOrbitPosition, getOrbitRotation, getScaledConfig } from '../core/positioning/orbit'

interface FloatingContentItemProps {
  /** The floating item data */
  data: LiveViewContentBlockItems
  /** Unique ID for this floating instance */
  floatingId: string
  /** Position in the orbit sequence */
  orbitIndex: number
  /** Total number of floating items */
  totalItems: number
  /** Whether this item is currently active */
  isActive: boolean
}

export const FloatingContentItem = ({
  data,
  floatingId,
  orbitIndex,
  totalItems,
  isActive,
}: FloatingContentItemProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const timeRef = useRef(0)
  const [hasEntered, setHasEntered] = useState(false)

  const setHoveredItem = useContentStore(state => state.setHoveredItem)
  const removeFloatingItem = useFloatingContentStore(state => state.removeFloatingItem)

  // Get scaled orbit config based on item count
  const orbitConfig = getScaledConfig(totalItems)

  // Entry animation (on mount)
  const { entryProgress, scale, opacity } = useSpring({
    from: { entryProgress: 0, scale: 0, opacity: 0 },
    to: { entryProgress: 1, scale: isActive ? 1.0 : 0.7, opacity: isActive ? 1.0 : 0.75 },
    config: { tension: 120, friction: 14 },
    onRest: () => setHasEntered(true),
  })

  // Scale/opacity animation when active state changes
  const { activeScale, activeOpacity } = useSpring({
    activeScale: isActive ? 1.0 : 0.7,
    activeOpacity: isActive ? 1.0 : 0.75,
    config: { tension: 200, friction: 20 },
  })

  // Continuous orbit animation
  useFrame((_, delta) => {
    if (!groupRef.current) return

    timeRef.current += delta

    if (isActive) {
      // Active floating item stays at center (relative to orbit group)
      groupRef.current.position.set(0, 0, 0)
      groupRef.current.rotation.set(0, 0, 0)
    } else {
      // Calculate orbit position
      const pos = getOrbitPosition(orbitIndex, totalItems, timeRef.current, orbitConfig)
      const rot = getOrbitRotation(pos)

      groupRef.current.position.set(pos[0], pos[1], pos[2])
      groupRef.current.rotation.set(rot[0], rot[1], rot[2])
    }
  })

  // Handle click - select this floating item
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const contentId = data.content?.content_id || data.content?.id

    useContentStore.setState({
      activeCategoryId: 'floating',
      activeItemId: contentId,
      activeItemData: data,
      activeItemIndex: orbitIndex,
    })
  }

  // Handle hover
  const handlePointerEnter = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHoveredItem(data)
  }

  const handlePointerLeave = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHoveredItem(null)
  }

  const contentId = data.content?.content_id || data.content?.id || floatingId

  return (
    <animated.group
      ref={groupRef}
      scale={hasEntered ? activeScale : scale}
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {/* Slight glow effect for floating items */}
      <group scale={1.02}>
        <PillarColumnItem
          data={data}
          position={[0, 0, 0]}
          categoryId="floating"
          itemIndex={orbitIndex}
        />
      </group>
    </animated.group>
  )
}

export default FloatingContentItem
