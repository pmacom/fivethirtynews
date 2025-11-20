import { create } from "zustand"

interface StageSelectStoreState {
  showStageSelect: boolean
  showSplash: boolean
}

export const useStageSelectStore = create<StageSelectStoreState>()((set) => ({
  showStageSelect: false,
  showSplash: true // Show splash screen on initial load
}))

export default useStageSelectStore
