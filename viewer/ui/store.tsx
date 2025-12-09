import { create } from "zustand";

interface UIStoreState {
  isHovered: boolean
  preventFade: boolean  // Block fade when true (e.g., input focused)
  setPreventFade: (prevent: boolean) => void
}

export const useUIStore = create<UIStoreState>()((set, get) => ({
  isHovered: false,
  preventFade: false,
  setPreventFade: (prevent: boolean) => set({ preventFade: prevent }),
}));

export default useUIStore
