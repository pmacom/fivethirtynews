import { create } from 'zustand'

export type ViewMode = 'pillar' | 'cloud' | 'stack' | 'carousel'

interface ViewModeState {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
}

export const useViewModeStore = create<ViewModeState>((set) => ({
  viewMode: 'pillar',
  setViewMode: (mode) => set({ viewMode: mode }),
}))

// View mode metadata for UI
export const VIEW_MODE_OPTIONS: { value: ViewMode; label: string; description: string }[] = [
  { value: 'pillar', label: 'Pillar', description: 'Circular column arrangement' },
  { value: 'cloud', label: 'Cloud', description: 'Scattered 3D space' },
  { value: 'stack', label: 'Stack', description: 'Layered cards' },
  { value: 'carousel', label: 'Carousel', description: 'Horizontal scroll' },
]
