import { create } from 'zustand'
import { useContentStore } from '../../core/store/contentStore'

export interface CategoryOption {
  index: number
  title: string
}

interface SectionExitConfig {
  currentCategoryIndex: number
  currentCategoryTitle: string
  leftCategory: CategoryOption | null
  rightCategory: CategoryOption | null
}

interface SectionExitStoreState {
  // State
  isVisible: boolean
  currentCategoryIndex: number
  currentCategoryTitle: string
  leftCategory: CategoryOption | null
  rightCategory: CategoryOption | null
  selectedSide: 'left' | 'right' | null

  // Actions
  show: (config: SectionExitConfig) => void
  hide: () => void
  selectLeft: () => void
  selectRight: () => void
  setSelectedSide: (side: 'left' | 'right' | null) => void
  confirmSelection: () => void
}

export const useSectionExitStore = create<SectionExitStoreState>()((set, get) => ({
  // Initial state
  isVisible: false,
  currentCategoryIndex: 0,
  currentCategoryTitle: '',
  leftCategory: null,
  rightCategory: null,
  selectedSide: null,

  // Show the modal with category options
  show: (config) => {
    set({
      isVisible: true,
      currentCategoryIndex: config.currentCategoryIndex,
      currentCategoryTitle: config.currentCategoryTitle,
      leftCategory: config.leftCategory,
      rightCategory: config.rightCategory,
      selectedSide: null,
    })
  },

  // Hide the modal
  hide: () => {
    set({
      isVisible: false,
      selectedSide: null,
    })
  },

  // Set which side is highlighted
  setSelectedSide: (side) => {
    set({ selectedSide: side })
  },

  // Navigate to left category
  selectLeft: () => {
    const { leftCategory } = get()
    if (!leftCategory) return

    // Navigate to first item of left category
    const contentStore = useContentStore.getState()
    const categoryIds = contentStore.categoryIds
    const itemIds = contentStore.itemIds

    if (leftCategory.index < categoryIds.length) {
      const categoryId = categoryIds[leftCategory.index]
      const firstItemId = itemIds[leftCategory.index]?.[0]

      if (categoryId && firstItemId) {
        useContentStore.setState({
          activeCategoryId: categoryId,
          activeCategoryIndex: leftCategory.index,
          activeItemId: firstItemId,
          activeItemIndex: 0,
        })
      }
    }

    set({ isVisible: false, selectedSide: null })
  },

  // Navigate to right category
  selectRight: () => {
    const { rightCategory } = get()
    if (!rightCategory) return

    // Navigate to first item of right category
    const contentStore = useContentStore.getState()
    const categoryIds = contentStore.categoryIds
    const itemIds = contentStore.itemIds

    if (rightCategory.index < categoryIds.length) {
      const categoryId = categoryIds[rightCategory.index]
      const firstItemId = itemIds[rightCategory.index]?.[0]

      if (categoryId && firstItemId) {
        useContentStore.setState({
          activeCategoryId: categoryId,
          activeCategoryIndex: rightCategory.index,
          activeItemId: firstItemId,
          activeItemIndex: 0,
        })
      }
    }

    set({ isVisible: false, selectedSide: null })
  },

  // Confirm the currently selected side
  confirmSelection: () => {
    const { selectedSide, selectLeft, selectRight } = get()
    if (selectedSide === 'left') {
      selectLeft()
    } else if (selectedSide === 'right') {
      selectRight()
    }
  },
}))

export default useSectionExitStore
