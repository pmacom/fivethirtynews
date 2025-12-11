import { create } from 'zustand';
import { Character } from './types';

interface CharactersState {
  characters: Character[];
  loading: boolean;
  error: string | null;
  selectedIndex: number;

  // Actions
  fetchCharacters: () => Promise<void>;
  setSelectedIndex: (index: number) => void;
  getSelectedCharacter: () => Character | null;
}

export const useCharactersStore = create<CharactersState>()((set, get) => ({
  characters: [],
  loading: false,
  error: null,
  selectedIndex: 0,

  fetchCharacters: async () => {
    set({ loading: true, error: null });

    try {
      const response = await fetch('/api/characters');
      const data = await response.json();

      if (data.success) {
        set({ characters: data.data, loading: false });
      } else {
        set({ error: data.error || 'Failed to fetch characters', loading: false });
      }
    } catch (err) {
      console.error('Error fetching characters:', err);
      set({ error: 'Failed to fetch characters', loading: false });
    }
  },

  setSelectedIndex: (index: number) => {
    const { characters } = get();
    if (index >= 0 && index < characters.length) {
      set({ selectedIndex: index });
    }
  },

  getSelectedCharacter: () => {
    const { characters, selectedIndex } = get();
    return characters[selectedIndex] || null;
  },
}));

export default useCharactersStore;
