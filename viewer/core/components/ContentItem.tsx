"use client"

import { useRef, useMemo, useCallback, useEffect } from 'react'
import * as THREE from 'three'
import { useSpring, animated, to } from '@react-spring/three'
import { ThreeEvent } from '@react-three/fiber'
import { isMobile, isTablet } from 'react-device-detect'

import { useContentStore } from '../store/contentStore'
import { FlattenedItem, ItemTransform, HoverAnimation } from '../positioning/types'
import TemplateSwitcher from '../../pillar/templates/TemplateSwitcher'

interface ContentItemProps {
  item: FlattenedItem
  transform: ItemTransform
  isActive: boolean
  isHovered: boolean
  hoverAnimation?: HoverAnimation
  onHover: (item: FlattenedItem | null) => void
  onClick?: (item: FlattenedItem) => void
}

// Spring config for view mode transitions
const TRANSITION_SPRING_CONFIG = { tension: 170, friction: 26 }

/**
 * Unified content item component
 * Handles rendering, hover animations, and interaction for all layouts
 *
 * Now animates position/rotation/scale changes for smooth view mode transitions.
 */
export function ContentItem({
  item,
  transform,
  isActive,
  isHovered,
  hoverAnimation,
  onHover,
  onClick,
}: ContentItemProps) {
  const groupRef = useRef<THREE.Group>(null)
  const activeItemId = useContentStore(state => state.activeItemId)

  const { itemData, categoryId, itemIndex, id } = item
  const contentType = itemData.content?.content_type
  const contentId = itemData.content?.content_id

  // Skip rendering if content is null (orphaned content_block_item)
  if (!itemData.content) {
    return null
  }

  // Mobile rotation adjustment
  const baseRotation = useMemo(() => {
    if (isMobile || isTablet) {
      return [0, 0, Math.PI / 2] as [number, number, number]
    }
    return [0, 0, 0] as [number, number, number]
  }, [])

  // Base transform spring - animates position/rotation/scale during view mode transitions
  const {
    posX, posY, posZ,
    rotX, rotY, rotZ,
    scaleVal
  } = useSpring({
    posX: transform.position[0],
    posY: transform.position[1],
    posZ: transform.position[2],
    rotX: transform.rotation[0] + baseRotation[0],
    rotY: transform.rotation[1] + baseRotation[1],
    rotZ: transform.rotation[2] + baseRotation[2],
    scaleVal: transform.scale,
    config: TRANSITION_SPRING_CONFIG,
  })

  // Hover animation spring (additive on top of base transform)
  const { liftY, liftZ, tiltX, hoverScale } = useSpring({
    liftY: isHovered && hoverAnimation?.liftY ? hoverAnimation.liftY : 0,
    liftZ: isHovered && hoverAnimation?.liftZ ? hoverAnimation.liftZ : 0,
    tiltX: isHovered && hoverAnimation?.tiltX ? hoverAnimation.tiltX : 0,
    hoverScale: isHovered && hoverAnimation?.scale ? hoverAnimation.scale : 1,
    config: { tension: 300, friction: 20 },
  })

  // Render content via TemplateSwitcher
  const content = useMemo(() => (
    TemplateSwitcher({
      data: itemData,
      categoryId,
      activeItemId,
      contentType,
      itemIndex,
    })
  ), [itemData, categoryId, activeItemId, contentType, itemIndex])

  // Update activeItemData when this item becomes active
  useEffect(() => {
    if (contentId === activeItemId && groupRef.current) {
      useContentStore.setState({ activeItemData: itemData })
    }
  }, [contentId, activeItemId, itemData])

  // Hover handlers
  const handlePointerEnter = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onHover(item)
  }, [item, onHover])

  const handlePointerLeave = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onHover(null)
  }, [onHover])

  // Click handler to select this item
  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onClick?.(item)
  }, [item, onClick])

  // Always use animated.group for smooth view mode transitions
  // Hover animations are additive on top of base transform springs
  // Use to() to combine multiple animated values reactively
  return (
    <animated.group
      ref={groupRef}
      position-x={posX}
      position-y={to([posY, liftY], (py, ly) => py + ly)}
      position-z={to([posZ, liftZ], (pz, lz) => pz + lz)}
      rotation-x={to([rotX, tiltX], (rx, tx) => rx + tx)}
      rotation-y={rotY}
      rotation-z={rotZ}
      scale={to([scaleVal, hoverScale], (s, hs) => s * hs)}
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {content}
    </animated.group>
  )
}

export default ContentItem
