import { create } from 'zustand';
import { Show } from './types';

interface ShowsState {
  shows: Show[];
  loading: boolean;
  error: string | null;
  selectedIndex: number;

  // Actions
  fetchShows: () => Promise<void>;
  setSelectedIndex: (index: number) => void;
  getSelectedShow: () => Show | null;
}

export const useShowsStore = create<ShowsState>()((set, get) => ({
  shows: [],
  loading: false,
  error: null,
  selectedIndex: 0,

  fetchShows: async () => {
    set({ loading: true, error: null });

    try {
      const response = await fetch('/api/shows');
      const data = await response.json();

      if (data.success) {
        // Filter to only active shows for the public page
        const activeShows = (data.data || []).filter(
          (show: Show) => show.status === 'active' || show.status === 'hiatus'
        );
        set({ shows: activeShows, loading: false });
      } else {
        set({ error: data.error || 'Failed to fetch shows', loading: false });
      }
    } catch (err) {
      console.error('Error fetching shows:', err);
      set({ error: 'Failed to fetch shows', loading: false });
    }
  },

  setSelectedIndex: (index: number) => {
    const { shows } = get();
    if (index >= 0 && index < shows.length) {
      set({ selectedIndex: index });
    }
  },

  getSelectedShow: () => {
    const { shows, selectedIndex } = get();
    return shows[selectedIndex] || null;
  },
}));

export default useShowsStore;
