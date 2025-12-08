"use client"

import { useRef, useMemo, useCallback, useEffect } from 'react'
import * as THREE from 'three'
import { useSpring, animated } from '@react-spring/three'
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

/**
 * Unified content item component
 * Handles rendering, hover animations, and interaction for all layouts
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

  // Hover animation spring
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

  // Combine base transform with hover animation
  const hasHoverAnimation = hoverAnimation && (
    hoverAnimation.liftY || hoverAnimation.liftZ || hoverAnimation.tiltX || hoverAnimation.scale
  )

  if (hasHoverAnimation) {
    return (
      <animated.group
        ref={groupRef}
        position-x={transform.position[0]}
        position-y={liftY.to(ly => transform.position[1] + ly)}
        position-z={liftZ.to(lz => transform.position[2] + lz)}
        rotation-x={tiltX.to(tx => transform.rotation[0] + baseRotation[0] + tx)}
        rotation-y={transform.rotation[1] + baseRotation[1]}
        rotation-z={transform.rotation[2] + baseRotation[2]}
        scale={hoverScale.to(s => transform.scale * s)}
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        {content}
      </animated.group>
    )
  }

  // No hover animation - simpler render
  return (
    <group
      ref={groupRef}
      position={transform.position}
      rotation={[
        transform.rotation[0] + baseRotation[0],
        transform.rotation[1] + baseRotation[1],
        transform.rotation[2] + baseRotation[2],
      ]}
      scale={transform.scale}
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {content}
    </group>
  )
}

export default ContentItem
