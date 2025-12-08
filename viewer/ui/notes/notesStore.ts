import { create } from 'zustand'

export interface NoteUser {
  id: string
  display_name: string
  discord_avatar: string | null
}

export interface Note {
  id: string
  note_text: string
  author_name: string
  user_id: string
  created_at: string
  updated_at: string
  user: NoteUser
}

interface NotesStore {
  notes: Note[]
  loading: boolean
  expanded: boolean
  contentId: string | null
  error: string | null

  fetchNotes: (contentId: string) => Promise<void>
  toggleExpanded: () => void
  setExpanded: (expanded: boolean) => void
  clearNotes: () => void
}

export const useNotesStore = create<NotesStore>((set, get) => ({
  notes: [],
  loading: false,
  expanded: true,
  contentId: null,
  error: null,

  fetchNotes: async (contentId: string) => {
    // Skip if already loading same content
    if (get().contentId === contentId && get().notes.length > 0) {
      return
    }

    set({ loading: true, error: null, contentId })

    try {
      const res = await fetch(`/api/content/${contentId}/notes`)
      const data = await res.json()

      if (data.success) {
        // API returns notes ordered by created_at DESC
        // Reverse for chat flow (oldest first)
        const notes = (data.data || []).reverse()
        set({ notes, loading: false })
      } else {
        // Non-authenticated users may get 401 - not an error for display
        set({ notes: [], loading: false })
      }
    } catch (err) {
      console.error('Failed to fetch notes:', err)
      set({ notes: [], loading: false, error: 'Failed to load notes' })
    }
  },

  toggleExpanded: () => {
    set(state => ({ expanded: !state.expanded }))
  },

  setExpanded: (expanded: boolean) => {
    set({ expanded })
  },

  clearNotes: () => {
    set({ notes: [], contentId: null, error: null })
  },
}))

export default useNotesStore
