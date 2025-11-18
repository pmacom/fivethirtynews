import { create } from "zustand";

interface UIStoreState {
  isHovered: boolean
}

export const useUIStore = create<UIStoreState>()((set, get) => ({
  isHovered: false
}));

export default useUIStore
