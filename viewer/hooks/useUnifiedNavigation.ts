import { useCallback, useMemo } from 'react'
import { useContentStore } from '../core/store/contentStore'
import { useFloatingContentStore } from '../core/store/floatingContentStore'
import { trackRelationship } from '../utils/trackRelationship'

/**
 * Represents a navigable item in the unified list
 */
export interface NavigableItem {
  /** Unique content ID */
  id: string
  /** Category this item belongs to (or 'floating') */
  categoryId: string
  /** Index of the category in the content array */
  categoryIndex: number
  /** Index of the item within its category */
  itemIndex: number
  /** Whether this is a floating item */
  isFloating: boolean
}

/**
 * Hook that provides unified navigation across both category content
 * and floating items. Enables seamless arrow key navigation.
 */
export function useUnifiedNavigation() {
  const content = useContentStore(state => state.content)
  const activeItemId = useContentStore(state => state.activeItemId)
  const floatingItems = useFloatingContentStore(state => state.floatingItems)

  // Build unified navigation list: category items + floating items
  const allItems = useMemo(() => {
    const items: NavigableItem[] = []

    // Add category items
    content?.forEach((category, catIndex) => {
      category.content_block_items?.forEach((item, itemIndex) => {
        const id = item.content?.content_id || item.content?.id || `${category.id}-${itemIndex}`
        items.push({
          id,
          categoryId: category.id,
          categoryIndex: catIndex,
          itemIndex,
          isFloating: false,
        })
      })
    })

    // Add floating items (virtual "floating" category at end)
    floatingItems.forEach((item, index) => {
      const id = item.data.content?.content_id || item.data.content?.id || item.id
      items.push({
        id,
        categoryId: 'floating',
        categoryIndex: content?.length || 0,
        itemIndex: index,
        isFloating: true,
      })
    })

    return items
  }, [content, floatingItems])

  // Find current item's index in the unified list
  const currentIndex = useMemo(() => {
    return allItems.findIndex(item => item.id === activeItemId)
  }, [allItems, activeItemId])

  // Get current item
  const currentItem = useMemo(() => {
    return currentIndex >= 0 ? allItems[currentIndex] : null
  }, [allItems, currentIndex])

  // Navigate to next item (with relationship tracking)
  const navigateNext = useCallback(() => {
    if (allItems.length === 0) return

    const previousId = activeItemId
    const nextIndex = (currentIndex + 1) % allItems.length
    const nextItem = allItems[nextIndex]

    if (nextItem.isFloating) {
      // Navigate to floating item
      const floatingItem = floatingItems.find(f => {
        const fId = f.data.content?.content_id || f.data.content?.id || f.id
        return fId === nextItem.id
      })

      if (floatingItem) {
        useContentStore.setState({
          activeCategoryId: 'floating',
          activeItemId: nextItem.id,
          activeItemData: floatingItem.data,
          activeItemIndex: nextItem.itemIndex,
        })
      }
    } else {
      // Navigate to category item using existing store method
      useContentStore.getState().setNextItem()
    }

    // Track navigation relationship
    if (previousId && nextItem.id && previousId !== nextItem.id) {
      trackRelationship(previousId, nextItem.id, 'navigation')
    }
  }, [allItems, currentIndex, activeItemId, floatingItems])

  // Navigate to previous item (with relationship tracking)
  const navigatePrev = useCallback(() => {
    if (allItems.length === 0) return

    const previousId = activeItemId
    const prevIndex = (currentIndex - 1 + allItems.length) % allItems.length
    const prevItem = allItems[prevIndex]

    if (prevItem.isFloating) {
      // Navigate to floating item
      const floatingItem = floatingItems.find(f => {
        const fId = f.data.content?.content_id || f.data.content?.id || f.id
        return fId === prevItem.id
      })

      if (floatingItem) {
        useContentStore.setState({
          activeCategoryId: 'floating',
          activeItemId: prevItem.id,
          activeItemData: floatingItem.data,
          activeItemIndex: prevItem.itemIndex,
        })
      }
    } else {
      // Navigate to category item using existing store method
      useContentStore.getState().setPrevItem()
    }

    // Track navigation relationship
    if (previousId && prevItem.id && previousId !== prevItem.id) {
      trackRelationship(previousId, prevItem.id, 'navigation')
    }
  }, [allItems, currentIndex, activeItemId, floatingItems])

  // Navigate to a specific item by ID
  const navigateTo = useCallback((id: string) => {
    const previousId = activeItemId
    const item = allItems.find(i => i.id === id)
    if (!item) return

    if (item.isFloating) {
      const floatingItem = floatingItems.find(f => {
        const fId = f.data.content?.content_id || f.data.content?.id || f.id
        return fId === id
      })

      if (floatingItem) {
        useContentStore.setState({
          activeCategoryId: 'floating',
          activeItemId: id,
          activeItemData: floatingItem.data,
          activeItemIndex: item.itemIndex,
        })
      }
    } else {
      // Find the actual content data
      const category = content?.[item.categoryIndex]
      const contentItem = category?.content_block_items?.[item.itemIndex]

      if (contentItem) {
        useContentStore.setState({
          activeCategoryId: item.categoryId,
          activeItemId: id,
          activeItemData: contentItem,
          activeCategoryIndex: item.categoryIndex,
          activeItemIndex: item.itemIndex,
        })
      }
    }

    // Track navigation relationship
    if (previousId && id && previousId !== id) {
      trackRelationship(previousId, id, 'navigation')
    }
  }, [allItems, floatingItems, content, activeItemId])

  return {
    /** All navigable items in order */
    allItems,
    /** Current item's index in the unified list */
    currentIndex,
    /** Current item data */
    currentItem,
    /** Whether the current item is a floating item */
    isFloatingActive: currentItem?.isFloating || false,
    /** Navigate to next item (wraps around) */
    navigateNext,
    /** Navigate to previous item (wraps around) */
    navigatePrev,
    /** Navigate to a specific item by ID */
    navigateTo,
    /** Total number of navigable items */
    totalItems: allItems.length,
    /** Number of floating items */
    floatingCount: floatingItems.length,
  }
}

export default useUnifiedNavigation
