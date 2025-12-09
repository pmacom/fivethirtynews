import { create } from 'zustand'

export type BrowseControlType = 'orbit' | 'wasd' | 'static'

interface SavedCameraState {
  position: [number, number, number]
  target: [number, number, number]
  zoom: number
}

interface BrowseModeState {
  // State
  isActive: boolean
  controlType: BrowseControlType
  savedCameraState: SavedCameraState | null

  // Actions
  enterBrowseMode: (controlType: BrowseControlType, cameraState: SavedCameraState) => void
  exitBrowseMode: (restoreCamera: boolean) => void
  toggleBrowseMode: () => void
  setControlType: (type: BrowseControlType) => void
}

export const useBrowseModeStore = create<BrowseModeState>()((set, get) => ({
  // Initial state
  isActive: false,
  controlType: 'orbit',
  savedCameraState: null,

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
}))

export default useBrowseModeStore
