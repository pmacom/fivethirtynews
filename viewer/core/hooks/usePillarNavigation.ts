import { useEffect, useCallback, useRef } from 'react'
import { useContentStore } from '../store/contentStore'
import { useSectionExitStore } from '../../ui/sectionexit/store'
import { useBrowseModeStore } from '../store/browseModeStore'
import { FlattenedItem } from '../positioning/types'
import {
  navigateWithinCategory,
  navigateBetweenCategories,
  getCategoryInfo,
} from '../positioning/utils'

interface UsePillarNavigationProps {
  items: FlattenedItem[]
  activeGlobalIndex: number
  enabled?: boolean
  onToggleFocus?: () => void
  onEscape?: () => void
  dragThreshold?: number  // Pixels to drag before triggering navigation
}

/**
 * Pillar-specific navigation hook
 * - Up/Down (keyboard, swipe, drag): Navigate within column (same category)
 * - Left/Right (keyboard, swipe, drag): Navigate between categories (rotate pillar)
 *
 * Supports both discrete swipes and continuous drag navigation.
 * Drag navigation works with mouse (click+drag) and touch (drag).
 */
export function usePillarNavigation({
  items,
  activeGlobalIndex,
  enabled = true,
  onToggleFocus,
  onEscape,
  dragThreshold = 80,  // Pixels to drag before triggering navigation
}: UsePillarNavigationProps) {
  const touchStartRef = useRef<{ x: number; y: number; lastNavigationTime: number } | null>(null)

  // Drag state for continuous navigation (mouse + touch)
  const dragStateRef = useRef<{
    isDragging: boolean
    startX: number
    startY: number
    accumulatedX: number  // Accumulated drag distance for horizontal
    accumulatedY: number  // Accumulated drag distance for vertical
    lastNavigationTime: number  // Debounce rapid navigations
  } | null>(null)

  // Minimum time between navigations (ms) - prevents rapid-fire navigation
  const NAVIGATION_COOLDOWN = 150

  // Get current item and category info
  const currentItem = items[activeGlobalIndex]
  const { categoryCount } = getCategoryInfo(items)

  // Navigate to a specific item
  const navigateToItem = useCallback((item: FlattenedItem | null) => {
    if (!item) return

    useContentStore.setState({
      activeCategoryId: item.categoryId,
      activeCategoryIndex: item.categoryIndex,
      activeItemId: item.contentId,
      activeItemData: item.itemData,
      activeItemIndex: item.itemIndex,
    })
  }, [])

  // Show section exit modal with adjacent category options
  const showSectionExitModal = useCallback(() => {
    if (!currentItem) return

    // Get category titles from content store
    const categoryTitles = useContentStore.getState().categoryTitles

    // Calculate left and right category indices (with wrapping)
    const leftIndex = currentItem.categoryIndex === 0
      ? categoryCount - 1
      : currentItem.categoryIndex - 1
    const rightIndex = (currentItem.categoryIndex + 1) % categoryCount

    useSectionExitStore.getState().show({
      currentCategoryIndex: currentItem.categoryIndex,
      currentCategoryTitle: categoryTitles[currentItem.categoryIndex] || `Category ${currentItem.categoryIndex + 1}`,
      leftCategory: {
        index: leftIndex,
        title: categoryTitles[leftIndex] || `Category ${leftIndex + 1}`,
      },
      rightCategory: {
        index: rightIndex,
        title: categoryTitles[rightIndex] || `Category ${rightIndex + 1}`,
      },
    })
  }, [currentItem, categoryCount])

  // Vertical navigation (within column)
  const goUp = useCallback(() => {
    // Don't navigate if modal is open
    if (useSectionExitStore.getState().isVisible) return
    if (!currentItem) return
    const newItem = navigateWithinCategory(items, currentItem, 'up')
    if (newItem === null) {
      // At top of column - show section exit modal
      showSectionExitModal()
    } else {
      navigateToItem(newItem)
    }
  }, [items, currentItem, navigateToItem, showSectionExitModal])

  const goDown = useCallback(() => {
    // Don't navigate if modal is open
    if (useSectionExitStore.getState().isVisible) return
    if (!currentItem) return
    const newItem = navigateWithinCategory(items, currentItem, 'down')
    if (newItem === null) {
      // At bottom of column - show section exit modal
      showSectionExitModal()
    } else {
      navigateToItem(newItem)
    }
  }, [items, currentItem, navigateToItem, showSectionExitModal])

  // Horizontal navigation (between categories)
  const goLeft = useCallback(() => {
    // Don't navigate if modal is open
    if (useSectionExitStore.getState().isVisible) return
    if (!currentItem) return
    const newItem = navigateBetweenCategories(items, currentItem, 'left', categoryCount)
    navigateToItem(newItem)
  }, [items, currentItem, categoryCount, navigateToItem])

  const goRight = useCallback(() => {
    // Don't navigate if modal is open
    if (useSectionExitStore.getState().isVisible) return
    if (!currentItem) return
    const newItem = navigateBetweenCategories(items, currentItem, 'right', categoryCount)
    navigateToItem(newItem)
  }, [items, currentItem, categoryCount, navigateToItem])

  // Keyboard handler
  useEffect(() => {
    if (!enabled || items.length === 0) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keys when section exit modal is open
      if (useSectionExitStore.getState().isVisible) return;

      // Don't capture keys when typing in input fields
      const activeElement = document.activeElement;
      const isTyping = activeElement?.tagName === 'INPUT' ||
                       activeElement?.tagName === 'TEXTAREA' ||
                       activeElement?.getAttribute('contenteditable') === 'true';

      if (isTyping) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          goUp()
          break
        case 'ArrowDown':
          e.preventDefault()
          goDown()
          break
        case 'ArrowLeft':
          e.preventDefault()
          goLeft()
          break
        case 'ArrowRight':
          e.preventDefault()
          goRight()
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          onToggleFocus?.()
          break
        case 'Escape':
          e.preventDefault()
          onEscape?.()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, items.length, goUp, goDown, goLeft, goRight, onToggleFocus, onEscape])

  // Touch drag handlers for continuous navigation (mobile)
  // Only active when NOT in browse mode
  useEffect(() => {
    if (!enabled || items.length === 0) return

    const handleTouchStart = (e: TouchEvent) => {
      // Don't start drag if in browse mode
      if (useBrowseModeStore.getState().isActive) return
      // Don't start drag if section exit modal is open
      if (useSectionExitStore.getState().isVisible) return

      if (e.touches.length === 1) {
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          lastNavigationTime: 0,
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current || e.touches.length !== 1) return
      // Don't process if browse mode became active
      if (useBrowseModeStore.getState().isActive) {
        touchStartRef.current = null
        return
      }

      const now = Date.now()
      // Check cooldown - prevent rapid-fire navigation
      if (now - touchStartRef.current.lastNavigationTime < NAVIGATION_COOLDOWN) {
        return
      }

      const deltaX = e.touches[0].clientX - touchStartRef.current.x
      const deltaY = e.touches[0].clientY - touchStartRef.current.y

      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)

      // Continuous navigation - trigger when drag threshold exceeded
      if (absY > dragThreshold && absY > absX) {
        // Vertical drag - navigate within column
        if (deltaY > 0) {
          goUp()  // Drag down = go up in column (pull content down to see higher items)
        } else {
          goDown()  // Drag up = go down in column
        }
        // Reset start position and record navigation time
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          lastNavigationTime: now,
        }
      } else if (absX > dragThreshold && absX > absY) {
        // Horizontal drag - navigate between categories
        if (deltaX > 0) {
          goLeft()  // Drag right = go left (rotate pillar to show left category)
        } else {
          goRight()  // Drag left = go right
        }
        // Reset start position and record navigation time
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          lastNavigationTime: now,
        }
      }
    }

    const handleTouchEnd = () => {
      touchStartRef.current = null
    }

    const handleTouchCancel = () => {
      touchStartRef.current = null
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })
    window.addEventListener('touchcancel', handleTouchCancel, { passive: true })

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchcancel', handleTouchCancel)
    }
  }, [enabled, items.length, goUp, goDown, goLeft, goRight, dragThreshold])

  // Mouse drag handlers for click+drag navigation (desktop)
  // Only active when NOT in browse mode
  useEffect(() => {
    if (!enabled || items.length === 0) return

    const handleMouseDown = (e: MouseEvent) => {
      // Don't start drag if in browse mode
      if (useBrowseModeStore.getState().isActive) return
      // Don't start drag if section exit modal is open
      if (useSectionExitStore.getState().isVisible) return
      // Only left click
      if (e.button !== 0) return

      dragStateRef.current = {
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        accumulatedX: 0,
        accumulatedY: 0,
        lastNavigationTime: 0,
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStateRef.current?.isDragging) return
      // Don't process if browse mode became active
      if (useBrowseModeStore.getState().isActive) {
        dragStateRef.current = null
        return
      }

      const now = Date.now()
      // Check cooldown - prevent rapid-fire navigation
      if (now - dragStateRef.current.lastNavigationTime < NAVIGATION_COOLDOWN) {
        return
      }

      const deltaX = e.clientX - dragStateRef.current.startX
      const deltaY = e.clientY - dragStateRef.current.startY

      // Determine dominant direction
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)

      if (absY > dragThreshold && absY > absX) {
        // Vertical drag - navigate within column
        if (deltaY > 0) {
          goUp()  // Drag down = go up in column (pull content down to see higher items)
        } else {
          goDown()  // Drag up = go down in column
        }
        // Reset start position and record navigation time
        dragStateRef.current.startX = e.clientX
        dragStateRef.current.startY = e.clientY
        dragStateRef.current.lastNavigationTime = now
      } else if (absX > dragThreshold && absX > absY) {
        // Horizontal drag - navigate between categories
        if (deltaX > 0) {
          goLeft()  // Drag right = go left (rotate pillar to show left category)
        } else {
          goRight()  // Drag left = go right
        }
        // Reset start position and record navigation time
        dragStateRef.current.startX = e.clientX
        dragStateRef.current.startY = e.clientY
        dragStateRef.current.lastNavigationTime = now
      }
    }

    const handleMouseUp = () => {
      dragStateRef.current = null
    }

    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [enabled, items.length, goUp, goDown, goLeft, goRight, dragThreshold])

  return {
    navigateToItem,
    goUp,
    goDown,
    goLeft,
    goRight,
  }
}

export default usePillarNavigation
