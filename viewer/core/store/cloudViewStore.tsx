import { create } from 'zustand'

export type CloudZoomLevel = 'distant' | 'focused'
export type CloudOrganizationMode = 'random' | 'clustered' | 'grid' | 'spiral'

interface CloudViewState {
  // Zoom level: distant (overview) or focused (full-screen on active)
  zoomLevel: CloudZoomLevel
  // How items are spatially organized
  organizationMode: CloudOrganizationMode
  // Whether camera can orbit freely (only in distant mode)
  orbitEnabled: boolean
  // Actions
  setZoomLevel: (level: CloudZoomLevel) => void
  setOrganizationMode: (mode: CloudOrganizationMode) => void
  toggleZoom: () => void
  setOrbitEnabled: (enabled: boolean) => void
}

export const useCloudViewStore = create<CloudViewState>((set, get) => ({
  zoomLevel: 'distant',
  organizationMode: 'random',
  orbitEnabled: true,

  setZoomLevel: (level) => {
    set({
      zoomLevel: level,
      // Enable orbit only in distant mode
      orbitEnabled: level === 'distant',
    })
  },

  setOrganizationMode: (mode) => set({ organizationMode: mode }),

  toggleZoom: () => {
    const current = get().zoomLevel
    const next = current === 'distant' ? 'focused' : 'distant'
    set({
      zoomLevel: next,
      orbitEnabled: next === 'distant',
    })
  },

  setOrbitEnabled: (enabled) => set({ orbitEnabled: enabled }),
}))

// Organization mode metadata for UI
export const ORGANIZATION_MODE_OPTIONS: {
  value: CloudOrganizationMode
  label: string
  description: string
  icon: string
}[] = [
  { value: 'random', label: 'Cloud', description: 'Scattered in 3D space', icon: 'cloud' },
  { value: 'clustered', label: 'Clusters', description: 'Grouped by category', icon: 'layers' },
  { value: 'grid', label: 'Grid', description: '3D grid layout', icon: 'grid' },
  { value: 'spiral', label: 'Spiral', description: 'Helix arrangement', icon: 'spiral' },
]

export default useCloudViewStore
