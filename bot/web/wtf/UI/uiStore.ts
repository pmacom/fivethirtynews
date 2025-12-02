import { createStore } from "zustand-x";

interface UIStoreState {
  isHovered: boolean
}

export const UIStore = createStore<UIStoreState>({
  isHovered: false
}, {
  name: 'wtf-ui-store',
  persist: { enabled: false }
}).extendActions(({}) => ({

}));

export default UIStore
