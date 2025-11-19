import { create } from "zustand"

interface StageSelectStoreState {
  showStageSelect: boolean
}

export const useStageSelectStore = create<StageSelectStoreState>()((set) => ({
  showStageSelect: false
}))

export default useStageSelectStore
