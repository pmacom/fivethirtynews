import { create } from 'zustand';

export type ScreenId = 'splash' | 'menu' | 'stageselect' | 'characters' | 'viewer';

interface NavigationState {
  // Current screen being displayed
  currentScreen: ScreenId;
  // History stack for back navigation
  history: ScreenId[];
  // Whether settings drawer is open
  settingsOpen: boolean;

  // Actions
  pushScreen: (screen: ScreenId) => void;
  popScreen: () => ScreenId | null;
  exitToViewer: () => void;
  resetToSplash: () => void;
  setSettingsOpen: (open: boolean) => void;
  toggleSettings: () => void;

  // Computed helpers
  canGoBack: () => boolean;
  getPreviousScreen: () => ScreenId | null;
}

export const useNavigationStore = create<NavigationState>()((set, get) => ({
  currentScreen: 'splash',
  history: [],
  settingsOpen: false,

  pushScreen: (screen: ScreenId) => {
    const { currentScreen, history } = get();
    // Don't push if already on this screen
    if (screen === currentScreen) return;

    set({
      history: [...history, currentScreen],
      currentScreen: screen,
    });
  },

  popScreen: () => {
    const { history } = get();
    if (history.length === 0) return null;

    const newHistory = [...history];
    const previousScreen = newHistory.pop()!;

    set({
      history: newHistory,
      currentScreen: previousScreen,
    });

    return previousScreen;
  },

  exitToViewer: () => {
    set({
      history: [],
      currentScreen: 'viewer',
      settingsOpen: false,
    });
  },

  resetToSplash: () => {
    set({
      history: [],
      currentScreen: 'splash',
      settingsOpen: false,
    });
  },

  setSettingsOpen: (open: boolean) => {
    set({ settingsOpen: open });
  },

  toggleSettings: () => {
    set((state) => ({ settingsOpen: !state.settingsOpen }));
  },

  canGoBack: () => {
    return get().history.length > 0;
  },

  getPreviousScreen: () => {
    const { history } = get();
    return history.length > 0 ? history[history.length - 1] : null;
  },
}));

export default useNavigationStore;
