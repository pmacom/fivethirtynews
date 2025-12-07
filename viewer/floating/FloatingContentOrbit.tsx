"use client"

import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useContentStore } from '../core/store/contentStore'
import { useFloatingContentStore } from '../core/store/floatingContentStore'
import FloatingContentItem from './FloatingContentItem'

/**
 * Container component that renders all floating content items
 * in orbit around the currently active content.
 *
 * The orbit group follows the world position of the active item,
 * so floating content appears to orbit around whatever is selected.
 */
export const FloatingContentOrbit = () => {
  const groupRef = useRef<THREE.Group>(null)

  // Get active item's 3D object reference for positioning
  const activeItemObject = useContentStore(state => state.activeItemObject)
  const activeItemId = useContentStore(state => state.activeItemId)

  // Get all floating items
  const floatingItems = useFloatingContentStore(state => state.floatingItems)

  // Track the active item's world position each frame
  useFrame(() => {
    if (!groupRef.current) return

    if (activeItemObject) {
      // Get world position of active item
      const worldPos = new THREE.Vector3()
      activeItemObject.getWorldPosition(worldPos)

      // Move orbit group to follow active item
      groupRef.current.position.copy(worldPos)
    } else {
      // Fallback to origin if no active item object
      groupRef.current.position.set(0, 0, 0)
    }
  })

  // Don't render if no floating items
  if (floatingItems.length === 0) {
    return null
  }

  // Check if the active item IS a floating item
  const activeFloatingItem = floatingItems.find(item => {
    const contentId = item.data.content?.content_id || item.data.content?.id
    return contentId === activeItemId
  })

  // If active item is floating, other floating items orbit around IT
  // Otherwise, all floating items orbit around the active category content
  const itemsToRender = activeFloatingItem
    ? floatingItems.filter(item => item.id !== activeFloatingItem.id)
    : floatingItems

  const totalItems = itemsToRender.length

  return (
    <group ref={groupRef}>
      {/* Render floating items that should orbit */}
      {itemsToRender.map((item, index) => {
        const contentId = item.data.content?.content_id || item.data.content?.id
        const isActive = contentId === activeItemId

        return (
          <FloatingContentItem
            key={item.id}
            data={item.data}
            floatingId={item.id}
            orbitIndex={index}
            totalItems={totalItems}
            isActive={isActive}
          />
        )
      })}

      {/* If a floating item is active, render it at center */}
      {activeFloatingItem && (
        <FloatingContentItem
          key={activeFloatingItem.id}
          data={activeFloatingItem.data}
          floatingId={activeFloatingItem.id}
          orbitIndex={0}
          totalItems={1}
          isActive={true}
        />
      )}
    </group>
  )
}

export default FloatingContentOrbit
