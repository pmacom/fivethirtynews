import { useEffect, useCallback, useRef } from 'react'
import { useContentStore } from '../store/contentStore'
import { useSectionExitStore } from '../../ui/sectionexit/store'
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
  swipeThreshold?: number
}

/**
 * Pillar-specific navigation hook
 * - Up/Down (keyboard & swipe): Navigate within column (same category)
 * - Left/Right (keyboard & swipe): Navigate between categories (rotate pillar)
 */
export function usePillarNavigation({
  items,
  activeGlobalIndex,
  enabled = true,
  onToggleFocus,
  onEscape,
  swipeThreshold = 50,
}: UsePillarNavigationProps) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const isSwipingRef = useRef(false)

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

  // Touch/swipe handlers
  useEffect(() => {
    if (!enabled || items.length === 0) return

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        }
        isSwipingRef.current = false
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current || e.touches.length !== 1) return

      const deltaX = e.touches[0].clientX - touchStartRef.current.x
      const deltaY = e.touches[0].clientY - touchStartRef.current.y

      // Mark as swiping if moved past threshold
      if (Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold) {
        isSwipingRef.current = true
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return

      // Don't process swipes when section exit modal is open
      if (useSectionExitStore.getState().isVisible) {
        touchStartRef.current = null
        isSwipingRef.current = false
        return
      }

      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStartRef.current.x
      const deltaY = touch.clientY - touchStartRef.current.y

      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)

      // Only process if moved past threshold
      if (absX > swipeThreshold || absY > swipeThreshold) {
        // Determine primary direction (horizontal vs vertical)
        if (absX > absY) {
          // Horizontal swipe - change category
          if (deltaX > 0) {
            goRight() // Swipe right = next category
          } else {
            goLeft() // Swipe left = previous category
          }
        } else {
          // Vertical swipe - navigate within column
          if (deltaY > 0) {
            goDown() // Swipe down = next item in column
          } else {
            goUp() // Swipe up = previous item in column
          }
        }
      }

      touchStartRef.current = null
      isSwipingRef.current = false
    }

    const handleTouchCancel = () => {
      touchStartRef.current = null
      isSwipingRef.current = false
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
  }, [enabled, items.length, goUp, goDown, goLeft, goRight, swipeThreshold])

  return {
    navigateToItem,
    goUp,
    goDown,
    goLeft,
    goRight,
    isSwiping: isSwipingRef.current,
  }
}

export default usePillarNavigation
