"use client"

import React, { useMemo, useEffect, useRef, useCallback } from 'react'
import { useSpring, animated } from '@react-spring/three'
import { useContentStore } from '../core/store/contentStore'
import { useCloudViewStore } from '../core/store/cloudViewStore'
import { useSceneStore } from '../scene/store'
import { useThree } from '@react-three/fiber'
import { calculatePositions, CloudItem, Position3D } from './cloud/positioners'
import PillarColumnItem from '../pillar/components/PillarColumnItem'

export const CloudLayout = () => {
  const contents = useContentStore(state => state.content)
  const activeItemId = useContentStore(state => state.activeItemId)
  const setHoveredItem = useContentStore(state => state.setHoveredItem)
  const { size: { width: canvasWidth, height: canvasHeight } } = useThree()
  const hasInitializedRef = useRef(false)

  // Cloud view state
  const zoomLevel = useCloudViewStore(state => state.zoomLevel)
  const organizationMode = useCloudViewStore(state => state.organizationMode)
  const toggleZoom = useCloudViewStore(state => state.toggleZoom)

  // Flatten all items from all categories with metadata
  const { allItems, categories } = useMemo(() => {
    if (!contents || contents.length === 0) {
      return { allItems: [] as CloudItem[], categories: [] as string[] }
    }

    const items: CloudItem[] = []
    const cats: string[] = []

    contents.forEach((category: any, categoryIndex: number) => {
      cats.push(category.id)
      category.content_block_items?.forEach((item: any, itemIndex: number) => {
        items.push({
          id: item.content?.content_id || item.content?.id || `${category.id}-${itemIndex}`,
          categoryId: category.id,
          categoryIndex,
          itemIndex,
        })
      })
    })

    return { allItems: items, categories: cats }
  }, [contents])

  // Get raw item data for rendering
  const itemDataMap = useMemo(() => {
    const map = new Map<string, any>()
    contents?.forEach((category: any) => {
      category.content_block_items?.forEach((item: any) => {
        const id = item.content?.content_id || item.content?.id
        if (id) map.set(id, item)
      })
    })
    return map
  }, [contents])

  // Calculate positions based on organization mode
  const positions = useMemo(() => {
    if (allItems.length === 0) return []
    return calculatePositions(allItems, categories, organizationMode)
  }, [allItems, categories, organizationMode])

  // Find active item index
  const activeIndex = useMemo(() => {
    return allItems.findIndex((item) => item.id === activeItemId)
  }, [allItems, activeItemId])

  // Get position of active item for focused mode
  const activePosition = useMemo(() => {
    if (activeIndex >= 0 && positions[activeIndex]) {
      return positions[activeIndex]
    }
    return [0, 0, 0] as Position3D
  }, [activeIndex, positions])

  // Animate group position and scale based on zoom level
  const { groupX, groupY, groupZ, groupScale, itemOpacity } = useSpring({
    // In focused mode, move the group so active item is at origin
    groupX: zoomLevel === 'focused' ? -activePosition[0] : 0,
    groupY: zoomLevel === 'focused' ? -activePosition[1] : 0,
    groupZ: zoomLevel === 'focused' ? -activePosition[2] : 0,
    // Scale up in focused mode for closer view
    groupScale: zoomLevel === 'focused' ? 1.5 : 1,
    // Dim other items in focused mode
    itemOpacity: zoomLevel === 'focused' ? 0.1 : 1,
    config: { tension: 200, friction: 30 },
    onRest: () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          useSceneStore.getState().fitToBox()
        })
      })
    },
  })

  // Handle item click - select and optionally zoom
  const handleItemClick = useCallback((itemId: string, itemData: any) => {
    const item = allItems.find(i => i.id === itemId)
    if (!item) return

    useContentStore.setState({
      activeCategoryId: item.categoryId,
      activeItemId: itemId,
      activeItemData: itemData,
      activeItemIndex: item.itemIndex,
    })

    // Double-click or click on already active item toggles zoom
    if (itemId === activeItemId) {
      toggleZoom()
    }
  }, [allItems, activeItemId, toggleZoom])

  // Handle scroll/wheel to toggle zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Only handle significant scrolls
      if (Math.abs(e.deltaY) > 50) {
        if (e.deltaY > 0 && zoomLevel === 'focused') {
          // Scroll down while focused = zoom out
          useCloudViewStore.setState({ zoomLevel: 'distant' })
        } else if (e.deltaY < 0 && zoomLevel === 'distant') {
          // Scroll up while distant = zoom in
          useCloudViewStore.setState({ zoomLevel: 'focused' })
        }
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: true })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [zoomLevel])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (allItems.length === 0) return

      let newIndex = activeIndex

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          newIndex = (activeIndex - 1 + allItems.length) % allItems.length
          break
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault()
          newIndex = (activeIndex + 1) % allItems.length
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          toggleZoom()
          return
        case 'Escape':
          if (zoomLevel === 'focused') {
            e.preventDefault()
            useCloudViewStore.setState({ zoomLevel: 'distant' })
          }
          return
        default:
          return
      }

      if (newIndex !== activeIndex) {
        const newItem = allItems[newIndex]
        const itemData = itemDataMap.get(newItem.id)
        useContentStore.setState({
          activeCategoryId: newItem.categoryId,
          activeItemId: newItem.id,
          activeItemData: itemData,
          activeItemIndex: newItem.itemIndex,
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [allItems, activeIndex, zoomLevel, toggleZoom, itemDataMap])

  // Initialize active item if needed
  useEffect(() => {
    if (allItems.length > 0 && !hasInitializedRef.current) {
      const currentActiveId = useContentStore.getState().activeItemId
      const hasValidActive = allItems.some((item) => item.id === currentActiveId)

      if (!hasValidActive) {
        const firstItem = allItems[0]
        const itemData = itemDataMap.get(firstItem.id)
        useContentStore.setState({
          activeCategoryId: firstItem.categoryId,
          activeItemId: firstItem.id,
          activeItemData: itemData,
          activeItemIndex: 0,
        })
      }
      hasInitializedRef.current = true
    }
  }, [allItems, itemDataMap])

  // Update scene store on resize
  useEffect(() => {
    useSceneStore.setState({ canvasWidth, canvasHeight })
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        useSceneStore.getState().fitToBox()
      })
    })
  }, [canvasWidth, canvasHeight])

  // Nothing to render while loading
  if (!contents || contents.length === 0 || allItems.length === 0) {
    return null
  }

  return (
    <animated.group
      position-x={groupX}
      position-y={groupY}
      position-z={groupZ}
      scale={groupScale}
    >
      {allItems.map((cloudItem, i) => {
        const itemData = itemDataMap.get(cloudItem.id)
        if (!itemData) return null

        const isActive = cloudItem.id === activeItemId
        const position = positions[i] || [0, 0, 0]

        return (
          <group
            key={cloudItem.id}
            position={position as [number, number, number]}
            onClick={(e) => {
              e.stopPropagation()
              handleItemClick(cloudItem.id, itemData)
            }}
            onPointerEnter={(e) => {
              e.stopPropagation()
              setHoveredItem(itemData)
            }}
            onPointerLeave={(e) => {
              e.stopPropagation()
              setHoveredItem(null)
            }}
          >
            {/* Wrapper for opacity animation in focused mode */}
            <animated.group
              scale={isActive && zoomLevel === 'focused' ? 1.2 : 1}
            >
              <PillarColumnItem
                data={itemData}
                position={[0, 0, 0]}
                categoryId={cloudItem.categoryId}
                itemIndex={cloudItem.itemIndex}
              />
            </animated.group>
          </group>
        )
      })}
    </animated.group>
  )
}

export default CloudLayout
