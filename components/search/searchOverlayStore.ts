import { create } from 'zustand'

export interface SearchContentItem {
  id: string
  title: string | null
  description: string | null
  url: string
  thumbnail_url: string | null
  platform: string
  author_name?: string | null
  author_username?: string | null
}

export type SearchOverlayMode = 'browse' | '3d-viewer' | 'curate'

interface SearchOverlayState {
  isOpen: boolean
  selectedItems: SearchContentItem[]
  mode: SearchOverlayMode
  onConfirm: ((items: SearchContentItem[]) => void) | null

  open: (mode: SearchOverlayMode, onConfirm?: (items: SearchContentItem[]) => void) => void
  close: () => void
  toggleItem: (item: SearchContentItem) => void
  clearSelection: () => void
  isSelected: (id: string) => boolean
}

export const useSearchOverlayStore = create<SearchOverlayState>((set, get) => ({
  isOpen: false,
  selectedItems: [],
  mode: 'browse',
  onConfirm: null,

  open: (mode, onConfirm) => set({
    isOpen: true,
    mode,
    onConfirm: onConfirm || null,
    selectedItems: []
  }),

  close: () => set({ isOpen: false, selectedItems: [], onConfirm: null }),

  toggleItem: (item) => set((state) => {
    const exists = state.selectedItems.find(i => i.id === item.id)
    return {
      selectedItems: exists
        ? state.selectedItems.filter(i => i.id !== item.id)
        : [...state.selectedItems, item]
    }
  }),

  clearSelection: () => set({ selectedItems: [] }),

  isSelected: (id) => get().selectedItems.some(i => i.id === id),
}))
