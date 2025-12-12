import { create } from 'zustand'

export interface ChannelGroup {
  id: string
  slug: string
  name: string
  icon: string | null
  description: string | null
  display_order: number
  channels: Channel[]
}

export interface Channel {
  id: string
  slug: string
  name: string
  icon: string | null
  description: string | null
  display_order: number
}

export interface Tag {
  id: string
  slug: string
  name: string
  usage_count?: number
}

export interface ContentItem {
  id: string
  content_id?: string
  content_url: string
  content_type: string
  title?: string | null
  description?: string | null
  author_name?: string | null
  author_username?: string | null
}

export interface ContentNote {
  id: string
  note_text: string
  author_name: string
  user_id: string
  created_at: string
  updated_at: string
  user: {
    id: string
    display_name: string
    discord_avatar: string | null
  }
}

interface ContentEditState {
  // Modal state
  isOpen: boolean
  contentId: string | null
  contentData: ContentItem | null

  // Channel state
  selectedChannels: Set<string>
  primaryChannel: string | null
  channelGroups: ChannelGroup[]
  channelsMap: Map<string, Channel & { groupId: string; groupName: string; groupIcon: string | null }>
  activeGroupId: string | null

  // Tags state
  selectedTags: Set<string>
  availableTags: Tag[]
  existingTags: string[]

  // Existing channel state (for change detection)
  existingChannels: string[]
  existingPrimaryChannel: string | null

  // Media focus state (true = media is primary, text is secondary)
  mediaFocus: boolean
  existingMediaFocus: boolean

  // Notes state
  noteText: string
  allNotes: ContentNote[]
  sendingNote: boolean

  // UI state
  activeTab: 'tags' | 'notes'
  loading: boolean
  saving: boolean
  error: string | null

  // Actions
  open: (contentId: string, contentData: ContentItem) => void
  close: () => void
  reset: () => void
  setActiveTab: (tab: 'tags' | 'notes') => void
  setActiveGroupId: (groupId: string | null) => void

  // Channel actions
  toggleChannel: (slug: string) => void
  setPrimaryChannel: (slug: string) => void

  // Media focus actions
  setMediaFocus: (value: boolean) => void
  toggleMediaFocus: () => void

  // Tag actions
  addTag: (slug: string) => void
  removeTag: (slug: string) => void

  // Notes actions
  setNoteText: (text: string) => void
  sendNote: () => Promise<boolean>

  // Data loading
  loadChannelGroups: () => Promise<void>
  loadTags: () => Promise<void>
  loadExistingData: (contentId: string) => Promise<void>

  // Save
  save: () => Promise<boolean>
}

const initialState = {
  isOpen: false,
  contentId: null,
  contentData: null,
  selectedChannels: new Set<string>(),
  primaryChannel: null,
  channelGroups: [],
  channelsMap: new Map(),
  activeGroupId: null,
  selectedTags: new Set<string>(),
  availableTags: [],
  existingTags: [],
  existingChannels: [],
  existingPrimaryChannel: null,
  mediaFocus: false,
  existingMediaFocus: false,
  noteText: '',
  allNotes: [],
  sendingNote: false,
  activeTab: 'tags' as const,
  loading: false,
  saving: false,
  error: null,
}

export const useContentEditStore = create<ContentEditState>((set, get) => ({
  ...initialState,

  open: async (contentId: string, contentData: ContentItem) => {
    set({
      isOpen: true,
      contentId,
      contentData,
      loading: true,
      error: null,
      // Reset selections
      selectedChannels: new Set<string>(),
      primaryChannel: null,
      selectedTags: new Set<string>(),
      mediaFocus: false,
      noteText: '',
      activeTab: 'tags',
      activeGroupId: null,
    })

    // Load data in parallel
    await Promise.all([
      get().loadChannelGroups(),
      get().loadTags(),
      get().loadExistingData(contentId),
    ])

    set({ loading: false })
  },

  close: () => {
    set({ isOpen: false })
    // Delay reset to allow close animation
    setTimeout(() => get().reset(), 300)
  },

  reset: () => {
    set(initialState)
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  setActiveGroupId: (groupId) => set({ activeGroupId: groupId }),

  toggleChannel: (slug) => {
    const { selectedChannels, primaryChannel } = get()
    const newChannels = new Set(selectedChannels)

    if (newChannels.has(slug)) {
      newChannels.delete(slug)
      // Update primary if we removed it
      if (primaryChannel === slug) {
        set({
          selectedChannels: newChannels,
          primaryChannel: newChannels.size > 0 ? Array.from(newChannels)[0] : null,
        })
        return
      }
    } else {
      newChannels.add(slug)
      // First selection becomes primary
      if (!primaryChannel) {
        set({
          selectedChannels: newChannels,
          primaryChannel: slug,
        })
        return
      }
    }

    set({ selectedChannels: newChannels })
  },

  setPrimaryChannel: (slug) => {
    const { selectedChannels } = get()
    if (selectedChannels.has(slug)) {
      set({ primaryChannel: slug })
    }
  },

  setMediaFocus: (value) => set({ mediaFocus: value }),

  toggleMediaFocus: () => set((state) => ({ mediaFocus: !state.mediaFocus })),

  addTag: (slug) => {
    const { selectedTags } = get()
    if (!selectedTags.has(slug)) {
      const newTags = new Set(selectedTags)
      newTags.add(slug)
      set({ selectedTags: newTags })
    }
  },

  removeTag: (slug) => {
    const { selectedTags } = get()
    if (selectedTags.has(slug)) {
      const newTags = new Set(selectedTags)
      newTags.delete(slug)
      set({ selectedTags: newTags })
    }
  },

  setNoteText: (text) => set({ noteText: text }),

  sendNote: async () => {
    const { contentId, noteText } = get()
    if (!contentId || !noteText.trim()) return false

    set({ sendingNote: true })

    try {
      const res = await fetch(`/api/content/${contentId}/notes`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_text: noteText.trim() }),
      })
      const data = await res.json()

      if (data.success && data.data) {
        // Add new note to the list
        set((state) => ({
          allNotes: [...state.allNotes, data.data],
          noteText: '',
          sendingNote: false,
        }))
        return true
      } else {
        console.error('Failed to send note:', data.error)
        set({ sendingNote: false })
        return false
      }
    } catch (err) {
      console.error('Error sending note:', err)
      set({ sendingNote: false })
      return false
    }
  },

  loadChannelGroups: async () => {
    try {
      const res = await fetch('/api/channels')
      const data = await res.json()

      if (data.success && data.data) {
        const groups: ChannelGroup[] = data.data
        const channelsMap = new Map<string, Channel & { groupId: string; groupName: string; groupIcon: string | null }>()

        groups.forEach((group) => {
          group.channels.forEach((channel) => {
            channelsMap.set(channel.slug, {
              ...channel,
              groupId: group.id,
              groupName: group.name,
              groupIcon: group.icon,
            })
          })
        })

        set({ channelGroups: groups, channelsMap })
      }
    } catch (err) {
      console.error('Failed to load channel groups:', err)
    }
  },

  loadTags: async () => {
    try {
      const res = await fetch('/api/tags')
      const data = await res.json()

      if (data.success && data.tags) {
        set({ availableTags: data.tags })
      }
    } catch (err) {
      console.error('Failed to load tags:', err)
    }
  },

  loadExistingData: async (contentId: string) => {
    try {
      // Fetch content to get tags array (stored directly on content table)
      console.log('[ContentEdit] Fetching content for ID:', contentId)
      const contentRes = await fetch(`/api/content/${contentId}`)
      const contentData = await contentRes.json()
      console.log('[ContentEdit] API response:', contentData)

      if (contentData.success && contentData.data) {
        const data = contentData.data

        // Load tags
        const existingTags = data.tags || []
        console.log('[ContentEdit] Existing tags:', existingTags)

        // Load channels
        const existingChannels = data.channels || []
        const existingPrimaryChannel = data.primary_channel || null
        console.log('[ContentEdit] Existing channels:', existingChannels, 'primary:', existingPrimaryChannel)

        // Load media focus
        const existingMediaFocus = data.media_focus || false
        console.log('[ContentEdit] Existing media_focus:', existingMediaFocus)

        set({
          existingTags,
          selectedTags: new Set(existingTags),
          existingChannels,
          existingPrimaryChannel,
          selectedChannels: new Set(existingChannels),
          primaryChannel: existingPrimaryChannel,
          existingMediaFocus,
          mediaFocus: existingMediaFocus,
        })
      } else {
        console.log('[ContentEdit] API returned no data or error:', contentData)
      }

      // Fetch notes - uses httpOnly cookie automatically via credentials: 'include'
      try {
        const notesRes = await fetch(`/api/content/${contentId}/notes`, {
          credentials: 'include',
        })
        const notesData = await notesRes.json()

        if (notesData.success) {
          // Store all notes
          const allNotes = notesData.data || []
          set({ allNotes })
        }
      } catch (notesErr) {
        console.error('Failed to load notes:', notesErr)
      }
    } catch (err) {
      console.error('Failed to load existing data:', err)
    }
  },

  save: async () => {
    const {
      contentId,
      selectedChannels,
      primaryChannel,
      selectedTags,
      existingTags,
      existingChannels,
      existingPrimaryChannel,
      mediaFocus,
      existingMediaFocus,
    } = get()

    if (!contentId) return false

    set({ saving: true, error: null })

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    try {
      // Check what changed for content update
      const currentTags = Array.from(selectedTags)
      const currentChannels = Array.from(selectedChannels)

      const tagsChanged =
        currentTags.length !== existingTags.length ||
        currentTags.some((t) => !existingTags.includes(t))

      const channelsChanged =
        currentChannels.length !== existingChannels.length ||
        currentChannels.some((c) => !existingChannels.includes(c))

      const primaryChanged = primaryChannel !== existingPrimaryChannel
      const mediaFocusChanged = mediaFocus !== existingMediaFocus

      // Build update payload for content (tags + channels in one request)
      const contentUpdates: Record<string, unknown> = {}

      if (tagsChanged) {
        contentUpdates.tags = currentTags
      }
      if (channelsChanged) {
        contentUpdates.channels = currentChannels
      }
      if (primaryChanged) {
        contentUpdates.primaryChannel = primaryChannel
      }
      if (mediaFocusChanged) {
        contentUpdates.mediaFocus = mediaFocus
      }

      // Send content update if anything changed
      if (Object.keys(contentUpdates).length > 0) {
        await fetch(`/api/content/${contentId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(contentUpdates),
        })
      }

      // Notes are sent immediately via sendNote(), not on save

      set({ saving: false })
      return true
    } catch (err) {
      console.error('Failed to save:', err)
      set({ saving: false, error: 'Failed to save changes' })
      return false
    }
  },
}))

export default useContentEditStore
