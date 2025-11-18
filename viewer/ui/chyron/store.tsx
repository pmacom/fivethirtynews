import { create } from "zustand";

interface ChyronStoreState {
  isVisible: boolean;
  currentCategory: string;
  timerId: NodeJS.Timeout | null;
  showChyron: (categoryName: string) => void;
  hideChyron: () => void;
}

const CHYRON_DURATION = 3000; // Exactly 3 seconds

export const useChyronStore = create<ChyronStoreState>((set, get) => ({
  isVisible: false,
  currentCategory: '',
  timerId: null,

  /**
   * Show chyron - ALWAYS called on category change
   * Clears any existing timer, shows the chyron, starts new 3s timer
   * Simple and predictable: category change = chyron shows
   */
  showChyron: (categoryName: string) => {
    // Clear any existing timer to prevent memory leak
    const { timerId } = get();
    if (timerId) {
      clearTimeout(timerId);
    }

    // Show the chyron with new category
    set({
      isVisible: true,
      currentCategory: categoryName
    });

    // Start timer to hide after exactly 3 seconds
    const newTimerId = setTimeout(() => {
      get().hideChyron();
    }, CHYRON_DURATION);

    set({ timerId: newTimerId });
  },

  /**
   * Hide chyron and clean up timer
   */
  hideChyron: () => {
    const { timerId } = get();
    if (timerId) {
      clearTimeout(timerId);
    }
    set({
      isVisible: false,
      timerId: null
    });
  },
}));

export default useChyronStore;
