"use client"

import React, { useMemo, useEffect, useRef } from 'react'
import { useSpring, animated } from '@react-spring/three'
import { easePolyInOut } from 'd3-ease'
import { useContentStore } from '../core/store/contentStore'
import { useSceneStore } from '../scene/store'
import { useThree } from '@react-three/fiber'
import PillarColumnItem from '../pillar/components/PillarColumnItem'

export const CarouselLayout = () => {
  const contents = useContentStore(state => state.content)
  const activeItemId = useContentStore(state => state.activeItemId)
  const { size: { width: canvasWidth, height: canvasHeight } } = useThree()
  const hasInitializedRef = useRef(false)

  // Flatten all items from all categories
  const allItems = useMemo(() => {
    if (!contents || contents.length === 0) return []

    const items: { item: any; categoryId: string; index: number }[] = []
    contents.forEach((category: any) => {
      category.content_block_items?.forEach((item: any, idx: number) => {
        items.push({ item, categoryId: category.id, index: idx })
      })
    })
    return items
  }, [contents])

  // Find active item's global index
  const activeGlobalIndex = useMemo(() => {
    return allItems.findIndex(({ item }) =>
      item?.content?.content_id === activeItemId || item?.content?.id === activeItemId
    )
  }, [allItems, activeItemId])

  // Spacing between items
  const itemSpacing = 2.5

  // Animate horizontal scroll to center active item
  const { positionX } = useSpring({
    positionX: activeGlobalIndex >= 0 ? -activeGlobalIndex * itemSpacing : 0,
    config: {
      duration: 1500,
      easing: easePolyInOut,
    },
    onRest: () => {
      useContentStore.setState({ isAnimating: false })
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          useSceneStore.getState().fitToBox()
        })
      })
    },
    onStart: () => {
      useContentStore.setState({ isAnimating: true })
    },
  })

  // Only set initial active item once, and only if none is set
  useEffect(() => {
    if (allItems.length > 0 && !hasInitializedRef.current) {
      const currentActiveId = useContentStore.getState().activeItemId
      const hasValidActive = allItems.some(({ item }) =>
        item?.content?.content_id === currentActiveId || item?.content?.id === currentActiveId
      )

      if (!hasValidActive) {
        const firstItem = allItems[0]
        useContentStore.setState({
          activeCategoryId: firstItem.categoryId,
          activeItemId: firstItem.item?.content?.content_id || firstItem.item?.content?.id,
          activeItemData: firstItem.item,
          activeItemIndex: 0,
        })
      }
      hasInitializedRef.current = true
    }
  }, [allItems])

  useEffect(() => {
    useSceneStore.setState({ canvasWidth, canvasHeight })
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        useSceneStore.getState().fitToBox()
      })
    })
  }, [canvasWidth, canvasHeight])

  if (!contents || contents.length === 0 || allItems.length === 0) return null

  return (
    <animated.group position-x={positionX}>
      {allItems.map(({ item, categoryId }, i) => {
        const isActive = i === activeGlobalIndex
        const distanceFromActive = activeGlobalIndex >= 0 ? Math.abs(i - activeGlobalIndex) : i

        // Items curve back slightly as they get further from center
        const zOffset = -distanceFromActive * 0.3
        const rotationY = (i - (activeGlobalIndex >= 0 ? activeGlobalIndex : 0)) * 0.05

        return (
          <group
            key={`${categoryId}-${i}`}
            position={[i * itemSpacing, 0, zOffset]}
            rotation={[0, rotationY, 0]}
          >
            <PillarColumnItem
              data={item}
              position={[0, 0, 0]}
              categoryId={categoryId}
              itemIndex={i}
            />
          </group>
        )
      })}
    </animated.group>
  )
}

export default CarouselLayout
