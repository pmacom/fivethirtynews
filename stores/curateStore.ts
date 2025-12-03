'use client';

import { create } from 'zustand';

// Types
export interface ContentItem {
  id: string;
  platform: string;
  url: string;
  title: string | null;
  description: string | null;
  author_name: string | null;
  author_avatar_url: string | null;
  thumbnail_url: string | null;
  media_assets: any[];
  tags: string[];
  approval_status: string;
  created_at: string;
}

export interface KanbanItem {
  id: string; // content id
  block_item_id: string | null; // content_block_items.id if selected
  is_selected: boolean;
  weight: number;
  note: string | null;
  content: ContentItem;
}

export interface KanbanColumn {
  id: string;
  title: string;
  description: string | null;
  weight: number;
  template_id: string | null;
  tags: string[];
  items: KanbanItem[];
}

export interface Episode {
  id: string;
  title: string;
  date: string | null;
  scheduled_at: string | null;
  episode_number: number | null;
  status: string;
}

export interface Show {
  id: string;
  name: string;
  slug: string;
}

export interface ContentWindow {
  since_date: string;
  until_date: string | null;
}

interface CurateStoreState {
  // Data
  show: Show | null;
  episode: Episode | null;
  columns: KanbanColumn[];
  contentWindow: ContentWindow | null;

  // UI state
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  includeUnapproved: boolean;
  activeCardId: string | null;
}

interface CurateStoreActions {
  // Data fetching
  fetchCurateData: (showSlug: string, episodeId: string) => Promise<void>;

  // Column actions
  addColumn: (showSlug: string, episodeId: string, title: string, tags?: string[]) => Promise<void>;
  updateColumn: (showSlug: string, episodeId: string, columnId: string, updates: { title?: string; tags?: string[] }) => Promise<void>;
  deleteColumn: (showSlug: string, episodeId: string, columnId: string) => Promise<void>;
  reorderColumns: (showSlug: string, episodeId: string, columnIds: string[]) => Promise<void>;

  // Item actions
  toggleItemSelection: (showSlug: string, episodeId: string, columnId: string, contentId: string, isSelected: boolean) => Promise<void>;
  reorderItems: (showSlug: string, episodeId: string, columnId: string, itemIds: string[]) => Promise<void>;
  selectAllInColumn: (showSlug: string, episodeId: string, columnId: string) => Promise<void>;
  deselectAllInColumn: (showSlug: string, episodeId: string, columnId: string) => Promise<void>;

  // Optimistic updates
  optimisticToggleSelection: (columnId: string, contentId: string) => void;
  optimisticReorderItems: (columnId: string, itemIds: string[]) => void;
  optimisticReorderColumns: (columnIds: string[]) => void;

  // UI actions
  setIncludeUnapproved: (include: boolean) => void;
  setActiveCardId: (id: string | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

type CurateStore = CurateStoreState & CurateStoreActions;

const initialState: CurateStoreState = {
  show: null,
  episode: null,
  columns: [],
  contentWindow: null,
  isLoading: false,
  isSaving: false,
  error: null,
  includeUnapproved: true,
  activeCardId: null,
};

export const useCurateStore = create<CurateStore>((set, get) => ({
  ...initialState,

  fetchCurateData: async (showSlug: string, episodeId: string) => {
    set({ isLoading: true, error: null });

    try {
      const { includeUnapproved } = get();
      // Add cache-busting timestamp to ensure fresh data on every fetch
      const timestamp = Date.now();
      const url = `/api/shows/${showSlug}/episodes/${episodeId}/curate?include_unapproved=${includeUnapproved}&_t=${timestamp}`;

      const res = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch curate data');
      }

      set({
        show: data.data.show,
        episode: data.data.episode,
        columns: data.data.columns,
        contentWindow: data.data.content_window,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false
      });
    }
  },

  addColumn: async (showSlug: string, episodeId: string, title: string, tags?: string[]) => {
    set({ isSaving: true, error: null });

    try {
      const res = await fetch(`/api/shows/${showSlug}/episodes/${episodeId}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, tags: tags || [] }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to add column');
      }

      // Add new column to state
      const newColumn: KanbanColumn = {
        ...data.data,
        items: [],
      };

      set(state => ({
        columns: [...state.columns, newColumn],
        isSaving: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isSaving: false
      });
    }
  },

  updateColumn: async (showSlug: string, episodeId: string, columnId: string, updates: { title?: string; tags?: string[] }) => {
    set({ isSaving: true, error: null });

    try {
      const res = await fetch(`/api/shows/${showSlug}/episodes/${episodeId}/blocks/${columnId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update column');
      }

      set(state => ({
        columns: state.columns.map(col =>
          col.id === columnId ? { ...col, ...updates } : col
        ),
        isSaving: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isSaving: false
      });
    }
  },

  deleteColumn: async (showSlug: string, episodeId: string, columnId: string) => {
    set({ isSaving: true, error: null });

    try {
      const res = await fetch(`/api/shows/${showSlug}/episodes/${episodeId}/blocks/${columnId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete column');
      }

      set(state => ({
        columns: state.columns.filter(col => col.id !== columnId),
        isSaving: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isSaving: false
      });
    }
  },

  reorderColumns: async (showSlug: string, episodeId: string, columnIds: string[]) => {
    // Optimistic update first
    get().optimisticReorderColumns(columnIds);

    try {
      const blocks = columnIds.map((id, index) => ({ id, weight: index }));

      const res = await fetch(`/api/shows/${showSlug}/episodes/${episodeId}/blocks/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to reorder columns');
      }
    } catch (err) {
      // Refetch on error to restore correct state
      get().fetchCurateData(showSlug, episodeId);
      set({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  toggleItemSelection: async (showSlug: string, episodeId: string, columnId: string, contentId: string, isSelected: boolean) => {
    // Optimistic update first
    get().optimisticToggleSelection(columnId, contentId);

    try {
      const method = isSelected ? 'DELETE' : 'POST';
      const body = isSelected ? { news_id: contentId } : { content_id: contentId };

      const res = await fetch(`/api/shows/${showSlug}/episodes/${episodeId}/blocks/${columnId}/items`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to toggle selection');
      }

      // Update block_item_id if we just created one
      if (!isSelected && data.data?.id) {
        set(state => ({
          columns: state.columns.map(col =>
            col.id === columnId
              ? {
                  ...col,
                  items: col.items.map(item =>
                    item.id === contentId
                      ? { ...item, block_item_id: data.data.id }
                      : item
                  ),
                }
              : col
          ),
        }));
      }
    } catch (err) {
      // Revert on error
      get().optimisticToggleSelection(columnId, contentId);
      set({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  reorderItems: async (showSlug: string, episodeId: string, columnId: string, itemIds: string[]) => {
    // Optimistic update first
    get().optimisticReorderItems(columnId, itemIds);

    try {
      // Only reorder selected items (those with block_item_id)
      const { columns } = get();
      const column = columns.find(c => c.id === columnId);
      if (!column) return;

      const selectedItems = column.items
        .filter(item => item.is_selected && item.block_item_id)
        .sort((a, b) => itemIds.indexOf(a.id) - itemIds.indexOf(b.id));

      const items = selectedItems.map((item, index) => ({
        id: item.block_item_id!,
        weight: index,
      }));

      if (items.length === 0) return;

      const res = await fetch(`/api/shows/${showSlug}/episodes/${episodeId}/blocks/${columnId}/items/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to reorder items');
      }
    } catch (err) {
      // Refetch on error
      get().fetchCurateData(showSlug, episodeId);
      set({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  selectAllInColumn: async (showSlug: string, episodeId: string, columnId: string) => {
    const { columns } = get();
    const column = columns.find(c => c.id === columnId);
    if (!column) return;

    const unselectedItems = column.items.filter(item => !item.is_selected);
    if (unselectedItems.length === 0) return;

    set({ isSaving: true });

    // Optimistic update - mark all as selected
    set(state => ({
      columns: state.columns.map(col =>
        col.id === columnId
          ? {
              ...col,
              items: col.items.map(item => ({ ...item, is_selected: true })),
            }
          : col
      ),
    }));

    try {
      // Add each unselected item
      const promises = unselectedItems.map(item =>
        fetch(`/api/shows/${showSlug}/episodes/${episodeId}/blocks/${columnId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content_id: item.id }),
        }).then(res => res.json())
      );

      await Promise.all(promises);

      // Refetch to get the new block_item_ids
      await get().fetchCurateData(showSlug, episodeId);
    } catch (err) {
      // Refetch on error to restore correct state
      get().fetchCurateData(showSlug, episodeId);
      set({ error: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      set({ isSaving: false });
    }
  },

  deselectAllInColumn: async (showSlug: string, episodeId: string, columnId: string) => {
    const { columns } = get();
    const column = columns.find(c => c.id === columnId);
    if (!column) return;

    const selectedItems = column.items.filter(item => item.is_selected);
    if (selectedItems.length === 0) return;

    set({ isSaving: true });

    // Optimistic update - mark all as unselected
    set(state => ({
      columns: state.columns.map(col =>
        col.id === columnId
          ? {
              ...col,
              items: col.items.map(item => ({ ...item, is_selected: false, block_item_id: null })),
            }
          : col
      ),
    }));

    try {
      // Remove each selected item
      const promises = selectedItems.map(item =>
        fetch(`/api/shows/${showSlug}/episodes/${episodeId}/blocks/${columnId}/items`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ news_id: item.id }),
        }).then(res => res.json())
      );

      await Promise.all(promises);
    } catch (err) {
      // Refetch on error to restore correct state
      get().fetchCurateData(showSlug, episodeId);
      set({ error: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      set({ isSaving: false });
    }
  },

  optimisticToggleSelection: (columnId: string, contentId: string) => {
    set(state => ({
      columns: state.columns.map(col =>
        col.id === columnId
          ? {
              ...col,
              items: col.items.map(item =>
                item.id === contentId
                  ? { ...item, is_selected: !item.is_selected }
                  : item
              ),
            }
          : col
      ),
    }));
  },

  optimisticReorderItems: (columnId: string, itemIds: string[]) => {
    set(state => ({
      columns: state.columns.map(col =>
        col.id === columnId
          ? {
              ...col,
              items: col.items.slice().sort((a, b) => {
                const aIdx = itemIds.indexOf(a.id);
                const bIdx = itemIds.indexOf(b.id);
                if (aIdx === -1 && bIdx === -1) return 0;
                if (aIdx === -1) return 1;
                if (bIdx === -1) return -1;
                return aIdx - bIdx;
              }),
            }
          : col
      ),
    }));
  },

  optimisticReorderColumns: (columnIds: string[]) => {
    set(state => ({
      columns: state.columns.slice().sort((a, b) => {
        const aIdx = columnIds.indexOf(a.id);
        const bIdx = columnIds.indexOf(b.id);
        return aIdx - bIdx;
      }),
    }));
  },

  setIncludeUnapproved: (include: boolean) => {
    set({ includeUnapproved: include });
  },

  setActiveCardId: (id: string | null) => {
    set({ activeCardId: id });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  reset: () => {
    set(initialState);
  },
}));

export default useCurateStore;
