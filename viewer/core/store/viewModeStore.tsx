import { create } from 'zustand'

export type ViewMode = 'pillar' | 'cloud' | 'stack' | 'carousel'

// Per-view configuration for camera controls and navigation
export interface ViewModeConfig {
  enableOrbitControls: boolean  // Allow mouse/touch orbit rotation
  enableWheelZoom: boolean      // Allow wheel-based zoom toggle
  navigationMode: 'flat' | 'grid'  // flat = linear navigation, grid = 2D column/row
}

// Configuration for each view mode
export const VIEW_MODE_CONFIG: Record<ViewMode, ViewModeConfig> = {
  pillar: {
    enableOrbitControls: false,  // Pillar manages its own rotation
    enableWheelZoom: false,
    navigationMode: 'grid',
  },
  cloud: {
    enableOrbitControls: false,
    enableWheelZoom: true,
    navigationMode: 'flat',
  },
  stack: {
    enableOrbitControls: false,
    enableWheelZoom: true,
    navigationMode: 'flat',
  },
  carousel: {
    enableOrbitControls: false,
    enableWheelZoom: false,
    navigationMode: 'flat',
  },
}

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
