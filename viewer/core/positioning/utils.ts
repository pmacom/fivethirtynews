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

/**
 * Get category count and items per category for grid navigation
 */
export function getCategoryInfo(items: FlattenedItem[]): {
  categoryCount: number
  itemsPerCategory: Map<number, FlattenedItem[]>
} {
  const itemsPerCategory = new Map<number, FlattenedItem[]>()

  items.forEach(item => {
    const existing = itemsPerCategory.get(item.categoryIndex) || []
    existing.push(item)
    itemsPerCategory.set(item.categoryIndex, existing)
  })

  return {
    categoryCount: itemsPerCategory.size,
    itemsPerCategory,
  }
}

/**
 * Navigate within the same category (vertical movement in pillar)
 * Returns the new item or null if at edge (signals modal should appear)
 */
export function navigateWithinCategory(
  items: FlattenedItem[],
  currentItem: FlattenedItem,
  direction: 'up' | 'down'
): FlattenedItem | null {
  const categoryItems = items.filter(i => i.categoryIndex === currentItem.categoryIndex)
  const currentIndexInCategory = categoryItems.findIndex(i => i.globalIndex === currentItem.globalIndex)

  if (currentIndexInCategory === -1) return null

  let newIndex: number
  if (direction === 'up') {
    // At top of column (highest index = highest Y position) - return null to signal edge reached
    if (currentIndexInCategory === categoryItems.length - 1) {
      return null
    }
    newIndex = currentIndexInCategory + 1
  } else {
    // At bottom of column (index 0 = lowest Y position) - return null to signal edge reached
    if (currentIndexInCategory === 0) {
      return null
    }
    newIndex = currentIndexInCategory - 1
  }

  return categoryItems[newIndex] || null
}

/**
 * Navigate between categories (horizontal movement in pillar)
 * Always goes to the first item of the new category
 */
export function navigateBetweenCategories(
  items: FlattenedItem[],
  currentItem: FlattenedItem,
  direction: 'left' | 'right',
  categoryCount: number
): FlattenedItem | null {
  if (categoryCount === 0) return null

  let newCategoryIndex: number
  if (direction === 'left') {
    // Wrap to last category
    newCategoryIndex = currentItem.categoryIndex === 0
      ? categoryCount - 1
      : currentItem.categoryIndex - 1
  } else {
    // Wrap to first category
    newCategoryIndex = (currentItem.categoryIndex + 1) % categoryCount
  }

  // Find items in new category
  const newCategoryItems = items.filter(i => i.categoryIndex === newCategoryIndex)
  if (newCategoryItems.length === 0) return null

  // Always go to first item of the new category
  return newCategoryItems[0] || null
}
