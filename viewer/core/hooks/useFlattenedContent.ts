import { useMemo } from 'react'
import { useContentStore } from '../store/contentStore'
import { flattenContent, findItemIndex } from '../positioning/utils'
import { FlattenedItem, PositionerConfig } from '../positioning/types'

interface UseFlattenedContentResult {
  items: FlattenedItem[]
  categories: typeof useContentStore extends (selector: (state: infer S) => any) => any
    ? S extends { content: infer C } ? C : never
    : never
  activeGlobalIndex: number
  activeCategoryIndex: number
  activeItemIndex: number
  activeItem: FlattenedItem | null
  hasContent: boolean
}

/**
 * Hook that provides flattened content with computed indices
 * Used by ContentScene to get all items in a flat array with metadata
 */
export function useFlattenedContent(): UseFlattenedContentResult {
  const contents = useContentStore(state => state.content)
  const activeItemId = useContentStore(state => state.activeItemId)
  const activeCategoryIndex = useContentStore(state => state.activeCategoryIndex)
  const activeItemIndex = useContentStore(state => state.activeItemIndex)

  // Memoize flattened items
  const items = useMemo(() => flattenContent(contents), [contents])

  // Find active item's global index
  const activeGlobalIndex = useMemo(() => {
    if (!activeItemId || items.length === 0) return 0
    const index = findItemIndex(items, activeItemId)
    return index >= 0 ? index : 0
  }, [items, activeItemId])

  // Get the active item
  const activeItem = useMemo(() => {
    return items[activeGlobalIndex] ?? null
  }, [items, activeGlobalIndex])

  return {
    items,
    categories: contents,
    activeGlobalIndex,
    activeCategoryIndex,
    activeItemIndex,
    activeItem,
    hasContent: items.length > 0,
  }
}

/**
 * Build the full PositionerConfig from flattened content and canvas size
 */
export function buildPositionerConfig(
  flattenedContent: UseFlattenedContentResult,
  canvasWidth: number,
  canvasHeight: number,
  options?: Record<string, any>
): PositionerConfig {
  return {
    items: flattenedContent.items,
    categories: flattenedContent.categories,
    activeGlobalIndex: flattenedContent.activeGlobalIndex,
    activeCategoryIndex: flattenedContent.activeCategoryIndex,
    activeItemIndex: flattenedContent.activeItemIndex,
    canvasWidth,
    canvasHeight,
    options,
  }
}
