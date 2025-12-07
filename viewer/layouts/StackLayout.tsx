"use client"

import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react'
import { useSpring, animated } from '@react-spring/three'
import { useContentStore } from '../core/store/contentStore'
import { useSceneStore } from '../scene/store'
import { useThree } from '@react-three/fiber'
import PillarColumnItem from '../pillar/components/PillarColumnItem'

// Individual stack item with hover lift animation
const StackItem = ({
  item,
  categoryId,
  globalIndex,
  stackPosition,
  isActive,
  isHovered,
  isFocused,
  onHover,
  onClick,
}: {
  item: any
  categoryId: string
  globalIndex: number
  stackPosition: number
  isActive: boolean
  isHovered: boolean
  isFocused: boolean
  onHover: (index: number | null) => void
  onClick: (index: number) => void
}) => {
  // Animate lift on hover
  const { liftY, liftZ, tiltX, scale } = useSpring({
    // Lift up and forward when hovered
    liftY: isHovered ? 0.8 : 0,
    liftZ: isHovered ? 1.5 : 0,
    // Tilt back slightly when hovered to show face
    tiltX: isHovered ? -0.15 : 0,
    // Scale up when focused (full screen)
    scale: isFocused && isActive ? 1.5 : 1,
    config: { tension: 300, friction: 20 },
  })

  // Stack positioning - items stack vertically with slight horizontal offset
  const baseY = stackPosition * -0.15  // Vertical stacking
  const baseZ = stackPosition * -0.08  // Depth stacking (back items further)
  const baseX = stackPosition * 0.02   // Slight horizontal fan
  const baseTiltX = stackPosition * 0.03  // Slight tilt for stack effect

  return (
    <animated.group
      position-x={baseX}
      position-y={liftY.to(ly => baseY + ly)}
      position-z={liftZ.to(lz => baseZ + lz)}
      rotation-x={tiltX.to(tx => baseTiltX + tx)}
      scale={scale}
      onPointerEnter={(e) => {
        e.stopPropagation()
        onHover(globalIndex)
      }}
      onPointerLeave={(e) => {
        e.stopPropagation()
        onHover(null)
      }}
      onClick={(e) => {
        e.stopPropagation()
        onClick(globalIndex)
      }}
    >
      <PillarColumnItem
        data={item}
        position={[0, 0, 0]}
        categoryId={categoryId}
        itemIndex={globalIndex}
      />
    </animated.group>
  )
}

export const StackLayout = () => {
  const contents = useContentStore(state => state.content)
  const activeItemId = useContentStore(state => state.activeItemId)
  const setHoveredItem = useContentStore(state => state.setHoveredItem)
  const { size: { width: canvasWidth, height: canvasHeight } } = useThree()
  const hasInitializedRef = useRef(false)

  // Local state for hover and focus
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [isFocused, setIsFocused] = useState(false)

  // Flatten all items from all categories
  const allItems = useMemo(() => {
    if (!contents || contents.length === 0) return []

    const items: { item: any; categoryId: string; index: number; id: string }[] = []
    contents.forEach((category: any) => {
      category.content_block_items?.forEach((item: any, idx: number) => {
        items.push({
          item,
          categoryId: category.id,
          index: idx,
          id: item?.content?.content_id || item?.content?.id || `${category.id}-${idx}`,
        })
      })
    })
    return items
  }, [contents])

  // Find active item's global index
  const activeGlobalIndex = useMemo(() => {
    return allItems.findIndex(({ id }) => id === activeItemId)
  }, [allItems, activeItemId])

  // Handle hover - update content store for Details panel
  const handleHover = useCallback((index: number | null) => {
    setHoveredIndex(index)
    if (index !== null && allItems[index]) {
      setHoveredItem(allItems[index].item)
    } else {
      setHoveredItem(null)
    }
  }, [allItems, setHoveredItem])

  // Handle click - select item and toggle focus
  const handleClick = useCallback((index: number) => {
    const clickedItem = allItems[index]
    if (!clickedItem) return

    // If clicking the already active item, toggle focus
    if (clickedItem.id === activeItemId) {
      setIsFocused(prev => !prev)
    } else {
      // Select the new item
      useContentStore.setState({
        activeCategoryId: clickedItem.categoryId,
        activeItemId: clickedItem.id,
        activeItemData: clickedItem.item,
        activeItemIndex: clickedItem.index,
      })
      // Auto-focus on selection
      setIsFocused(true)
    }
  }, [allItems, activeItemId])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (allItems.length === 0) return

      let newIndex = activeGlobalIndex

      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault()
          newIndex = (activeGlobalIndex - 1 + allItems.length) % allItems.length
          break
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault()
          newIndex = (activeGlobalIndex + 1) % allItems.length
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          setIsFocused(prev => !prev)
          return
        case 'Escape':
          if (isFocused) {
            e.preventDefault()
            setIsFocused(false)
          }
          return
        default:
          return
      }

      if (newIndex !== activeGlobalIndex) {
        const newItem = allItems[newIndex]
        useContentStore.setState({
          activeCategoryId: newItem.categoryId,
          activeItemId: newItem.id,
          activeItemData: newItem.item,
          activeItemIndex: newItem.index,
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [allItems, activeGlobalIndex, isFocused])

  // Scroll to toggle focus
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 50) {
        if (e.deltaY > 0 && isFocused) {
          setIsFocused(false)
        } else if (e.deltaY < 0 && !isFocused) {
          setIsFocused(true)
        }
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: true })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [isFocused])

  // Animate the whole stack based on active item
  const { stackY } = useSpring({
    // Move stack so active item is centered
    stackY: activeGlobalIndex * 0.15,
    config: { tension: 200, friction: 25 },
    onRest: () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          useSceneStore.getState().fitToBox()
        })
      })
    },
  })

  // Initialize active item if needed
  useEffect(() => {
    if (allItems.length > 0 && !hasInitializedRef.current) {
      const currentActiveId = useContentStore.getState().activeItemId
      const hasValidActive = allItems.some(({ id }) => id === currentActiveId)

      if (!hasValidActive) {
        const firstItem = allItems[0]
        useContentStore.setState({
          activeCategoryId: firstItem.categoryId,
          activeItemId: firstItem.id,
          activeItemData: firstItem.item,
          activeItemIndex: 0,
        })
      }
      hasInitializedRef.current = true
    }
  }, [allItems])

  // Update scene store on resize
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
    <animated.group position-y={stackY} rotation={[0.1, 0, 0]}>
      {/* Render from back to front for proper depth */}
      {[...allItems].reverse().map(({ item, categoryId, id }, reversedIndex) => {
        const globalIndex = allItems.length - 1 - reversedIndex
        const stackPosition = globalIndex - activeGlobalIndex
        const isActive = id === activeItemId
        const isHovered = hoveredIndex === globalIndex

        return (
          <StackItem
            key={id}
            item={item}
            categoryId={categoryId}
            globalIndex={globalIndex}
            stackPosition={stackPosition}
            isActive={isActive}
            isHovered={isHovered}
            isFocused={isFocused}
            onHover={handleHover}
            onClick={handleClick}
          />
        )
      })}
    </animated.group>
  )
}

export default StackLayout
