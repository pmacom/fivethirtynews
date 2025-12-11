import { create } from 'zustand'

export type BrowseControlType = 'orbit' | 'wasd' | 'static' | 'pillar-camera'

interface SavedCameraState {
  position: [number, number, number]
  target: [number, number, number]
  zoom: number
}

interface PillarCameraState {
  angle: number      // Radians, camera's orbital position around pillar
  height: number     // Y position (camera height)
  radius: number     // Distance from pillar center
  minHeight: number  // Bottom of pillar (typically 0 or slightly below)
  maxHeight: number  // Top of pillar (max items - 1)
}

interface BrowseModeState {
  // State
  isActive: boolean
  controlType: BrowseControlType
  savedCameraState: SavedCameraState | null
  pillarCameraState: PillarCameraState | null

  // Actions
  enterBrowseMode: (controlType: BrowseControlType, cameraState: SavedCameraState) => void
  exitBrowseMode: (restoreCamera: boolean) => void
  toggleBrowseMode: () => void
  setControlType: (type: BrowseControlType) => void
  setPillarCameraState: (state: PillarCameraState) => void
  initPillarBrowse: (radius: number, angle: number, height: number, minHeight: number, maxHeight: number) => void
}

export const useBrowseModeStore = create<BrowseModeState>()((set, get) => ({
  // Initial state
  isActive: false,
  controlType: 'orbit',
  savedCameraState: null,
  pillarCameraState: null,

  // Enter browse mode - saves current camera state
  enterBrowseMode: (controlType, cameraState) => {
    set({
      isActive: true,
      controlType,
      savedCameraState: cameraState,
    })
  },

  // Exit browse mode - optionally restore camera state
  exitBrowseMode: (restoreCamera) => {
    const { savedCameraState } = get()

    set({
      isActive: false,
      // Keep savedCameraState available for restoration if needed
      // It will be cleared on next enter
    })

    // Return saved state if caller wants to restore
    if (restoreCamera && savedCameraState) {
      return savedCameraState
    }
    return null
  },

  // Toggle browse mode (used by Tab key)
  toggleBrowseMode: () => {
    const { isActive } = get()
    if (isActive) {
      // Will exit and restore - actual restoration handled by SceneCamera
      set({ isActive: false })
    }
    // Note: entering is handled separately since we need camera state
  },

  // Change control type while in browse mode
  setControlType: (type) => {
    set({ controlType: type })
  },

  // Update pillar camera state (for drag interactions)
  setPillarCameraState: (state) => {
    set({ pillarCameraState: state })
  },

  // Initialize pillar browse mode with camera orbit parameters
  initPillarBrowse: (radius, angle, height, minHeight, maxHeight) => {
    set({
      pillarCameraState: { radius, angle, height, minHeight, maxHeight }
    })
  },
}))

export default useBrowseModeStore
