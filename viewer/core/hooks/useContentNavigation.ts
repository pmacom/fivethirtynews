import { useEffect, useCallback } from 'react'
import { useContentStore } from '../store/contentStore'
import { FlattenedItem } from '../positioning/types'
import { getNextIndex, getPrevIndex } from '../positioning/utils'

interface UseContentNavigationProps {
  items: FlattenedItem[]
  activeGlobalIndex: number
  enabled?: boolean
  onToggleFocus?: () => void
  onEscape?: () => void
}

/**
 * Unified hook for keyboard and navigation controls
 * Handles arrow keys, enter/space, escape across all layouts
 */
export function useContentNavigation({
  items,
  activeGlobalIndex,
  enabled = true,
  onToggleFocus,
  onEscape,
}: UseContentNavigationProps) {
  // Navigate to a specific item by global index
  const navigateToItem = useCallback((index: number) => {
    const item = items[index]
    if (!item) return

    useContentStore.setState({
      activeCategoryId: item.categoryId,
      activeCategoryIndex: item.categoryIndex,
      activeItemId: item.contentId, // Use contentId for data lookups
      activeItemData: item.itemData,
      activeItemIndex: item.itemIndex,
    })
  }, [items])

  // Navigate to next item
  const goToNext = useCallback(() => {
    if (items.length === 0) return
    const nextIndex = getNextIndex(activeGlobalIndex, items.length)
    navigateToItem(nextIndex)
  }, [items, activeGlobalIndex, navigateToItem])

  // Navigate to previous item
  const goToPrev = useCallback(() => {
    if (items.length === 0) return
    const prevIndex = getPrevIndex(activeGlobalIndex, items.length)
    navigateToItem(prevIndex)
  }, [items, activeGlobalIndex, navigateToItem])

  // Keyboard handler
  useEffect(() => {
    if (!enabled || items.length === 0) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keys when typing in input fields
      const activeElement = document.activeElement;
      const isTyping = activeElement?.tagName === 'INPUT' ||
                       activeElement?.tagName === 'TEXTAREA' ||
                       activeElement?.getAttribute('contenteditable') === 'true';

      if (isTyping) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          goToPrev()
          break
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault()
          goToNext()
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
  }, [enabled, items.length, goToNext, goToPrev, onToggleFocus, onEscape])

  return {
    navigateToItem,
    goToNext,
    goToPrev,
  }
}

interface UseWheelNavigationProps {
  enabled?: boolean
  onScrollUp?: () => void
  onScrollDown?: () => void
  threshold?: number
}

/**
 * Hook for wheel/scroll navigation
 * Used for zoom toggle or item navigation depending on layout
 */
export function useWheelNavigation({
  enabled = true,
  onScrollUp,
  onScrollDown,
  threshold = 50,
}: UseWheelNavigationProps) {
  useEffect(() => {
    if (!enabled) return

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > threshold) {
        if (e.deltaY > 0) {
          onScrollDown?.()
        } else {
          onScrollUp?.()
        }
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: true })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [enabled, onScrollUp, onScrollDown, threshold])
}
