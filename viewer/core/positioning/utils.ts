import { LiveViewContentBlock } from '../content/types'
import { FlattenedItem } from './types'

/**
 * Flatten content blocks into a single array of items with metadata
 * This is used by all layouts to convert hierarchical content into a flat list
 */
export function flattenContent(contents: LiveViewContentBlock[]): FlattenedItem[] {
  if (!contents || contents.length === 0) return []

  const items: FlattenedItem[] = []
  let globalIndex = 0

  contents.forEach((category, categoryIndex) => {
    category.content_block_items?.forEach((item, itemIndex) => {
      // Use content_id for data lookup, but globalIndex for unique React key
      const contentId = item.content?.content_id || item.content?.id || `${category.id}-${itemIndex}`
      // Unique key includes category to handle same content in multiple categories
      const uniqueKey = `${category.id}-${contentId}-${itemIndex}`

      items.push({
        id: uniqueKey,
        contentId, // Store original content ID for data operations
        itemData: item,
        categoryId: category.id,
        categoryIndex,
        itemIndex,
        globalIndex,
      })

      globalIndex++
    })
  })

  return items
}

/**
 * Find the global index of an item by its content ID
 */
export function findItemIndex(items: FlattenedItem[], itemId: string): number {
  return items.findIndex(item => item.contentId === itemId)
}

/**
 * Get item by global index
 */
export function getItemByIndex(items: FlattenedItem[], index: number): FlattenedItem | null {
  return items[index] ?? null
}

/**
 * Get all items in a specific category
 */
export function getItemsInCategory(items: FlattenedItem[], categoryId: string): FlattenedItem[] {
  return items.filter(item => item.categoryId === categoryId)
}

/**
 * Get the next item index (wrapping)
 */
export function getNextIndex(currentIndex: number, total: number): number {
  return (currentIndex + 1) % total
}

/**
 * Get the previous item index (wrapping)
 */
export function getPrevIndex(currentIndex: number, total: number): number {
  return (currentIndex - 1 + total) % total
}

/**
 * Create a map of item IDs to item data for quick lookup
 */
export function createItemDataMap(items: FlattenedItem[]): Map<string, FlattenedItem> {
  const map = new Map<string, FlattenedItem>()
  items.forEach(item => map.set(item.id, item))
  return map
}
