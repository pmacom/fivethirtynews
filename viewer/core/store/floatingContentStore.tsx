import { create } from 'zustand'
import { LiveViewContentBlockItems } from '../content/types'

/**
 * Represents a piece of content "floating" in the 3D scene,
 * orbiting around the currently active content.
 */
export interface FloatingItem {
  /** Unique identifier for this floating instance */
  id: string
  /** The content data to render */
  data: LiveViewContentBlockItems
  /** ID of the content this was spawned from (search context anchor) */
  anchorId: string | null
  /** Timestamp when added (for ordering) */
  addedAt: number
  /** Position in the orbit sequence (auto-assigned) */
  orbitIndex: number
}

interface FloatingContentState {
  /** All floating items currently in the scene */
  floatingItems: FloatingItem[]

  /** Add a new floating item to the scene */
  addFloatingItem: (data: LiveViewContentBlockItems, anchorId?: string) => void

  /** Remove a floating item by its ID */
  removeFloatingItem: (id: string) => void

  /** Clear all floating items */
  clearFloatingItems: () => void

  /** Check if a content ID is currently floating */
  isFloating: (contentId: string) => boolean

  /** Get floating item by content ID */
  getFloatingByContentId: (contentId: string) => FloatingItem | undefined
}

export const useFloatingContentStore = create<FloatingContentState>((set, get) => ({
  floatingItems: [],

  addFloatingItem: (data, anchorId) => {
    const contentId = data.content?.content_id || data.content?.id || data.id
    const id = `floating-${contentId}-${Date.now()}`
    const existing = get().floatingItems

    // Prevent duplicates (same content already floating)
    if (existing.some(item => {
      const itemContentId = item.data.content?.content_id || item.data.content?.id || item.data.id
      return itemContentId === contentId
    })) {
      console.log('[FloatingContent] Content already floating:', contentId)
      return
    }

    const newItem: FloatingItem = {
      id,
      data,
      anchorId: anchorId || null,
      addedAt: Date.now(),
      orbitIndex: existing.length,
    }

    set({ floatingItems: [...existing, newItem] })
    console.log('[FloatingContent] Added floating item:', id)
  },

  removeFloatingItem: (id) => {
    const filtered = get().floatingItems.filter(item => item.id !== id)
    // Reindex remaining items
    const reindexed = filtered.map((item, i) => ({ ...item, orbitIndex: i }))
    set({ floatingItems: reindexed })
    console.log('[FloatingContent] Removed floating item:', id)
  },

  clearFloatingItems: () => {
    set({ floatingItems: [] })
    console.log('[FloatingContent] Cleared all floating items')
  },

  isFloating: (contentId) => {
    return get().floatingItems.some(item => {
      const itemContentId = item.data.content?.content_id || item.data.content?.id || item.data.id
      return itemContentId === contentId
    })
  },

  getFloatingByContentId: (contentId) => {
    return get().floatingItems.find(item => {
      const itemContentId = item.data.content?.content_id || item.data.content?.id || item.data.id
      return itemContentId === contentId
    })
  },
}))

export default useFloatingContentStore
