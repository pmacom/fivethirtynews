"use client"

import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useContentStore } from '../../core/store/contentStore'
import { useNotesStore, Note } from './notesStore'
import { cn } from '@/lib/utils'

/**
 * Format a date string to relative time (e.g., "2h ago", "3d ago")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  // Fallback to date format
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Get Discord avatar URL or fallback
 */
function getAvatarUrl(user: Note['user']): string {
  if (user.discord_avatar) {
    // Discord avatar URLs are already complete URLs
    if (user.discord_avatar.startsWith('http')) {
      return user.discord_avatar
    }
    // Or they might be just the hash - construct full URL
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.discord_avatar}.png`
  }
  // Fallback to a default avatar (Discord's default)
  return `https://cdn.discordapp.com/embed/avatars/${parseInt(user.id) % 5}.png`
}

/**
 * Single note message in the chat
 */
function NoteMessage({ note }: { note: Note }) {
  const avatarUrl = getAvatarUrl(note.user)
  const displayName = note.user?.display_name || note.author_name || 'Anonymous'

  return (
    <div className="flex gap-2.5 group">
      <img
        src={avatarUrl}
        alt={displayName}
        className="w-8 h-8 rounded-full flex-shrink-0 ring-1 ring-white/10"
        onError={(e) => {
          // Fallback if avatar fails to load
          e.currentTarget.src = `https://cdn.discordapp.com/embed/avatars/0.png`
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-white truncate">
            {displayName}
          </span>
          <span className="text-xs text-zinc-500 flex-shrink-0">
            {formatRelativeTime(note.created_at)}
          </span>
        </div>
        <p className="text-sm text-zinc-300 mt-0.5 break-words">
          {note.note_text}
        </p>
      </div>
    </div>
  )
}

/**
 * NotesChat
 *
 * A floating chat panel showing all user-submitted notes for the currently active content.
 * Positioned in the bottom-right corner, styled like a modern chat interface.
 */
export function NotesChat() {
  const activeItemData = useContentStore(state => state.activeItemData)
  const { notes, loading, expanded, fetchNotes, toggleExpanded, clearNotes } = useNotesStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Get content ID from active item
  const contentId = activeItemData?.content?.id || activeItemData?.content?.content_id

  // Fetch notes when content changes
  useEffect(() => {
    if (contentId) {
      fetchNotes(contentId)
    } else {
      clearNotes()
    }
  }, [contentId, fetchNotes, clearNotes])

  // Auto-scroll to bottom when notes change
  useEffect(() => {
    if (scrollRef.current && expanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [notes, expanded])

  // Don't render if no content selected or no notes
  if (!contentId || (notes.length === 0 && !loading)) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed bottom-20 right-4 z-[103] w-80"
    >
      <div className="bg-black/90 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header - always visible */}
        <button
          onClick={toggleExpanded}
          className={cn(
            'w-full flex items-center justify-between px-4 py-3',
            'text-left transition-colors',
            'hover:bg-white/5',
            expanded && 'border-b border-white/10'
          )}
        >
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-medium text-white">
              Notes
            </span>
            <span className="text-xs text-zinc-500 bg-white/10 px-1.5 py-0.5 rounded">
              {notes.length}
            </span>
          </div>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          )}
        </button>

        {/* Chat messages */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div
                ref={scrollRef}
                className="max-h-64 overflow-y-auto space-y-3 p-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
              >
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                  </div>
                ) : notes.length === 0 ? (
                  <div className="text-center py-4 text-sm text-zinc-500">
                    No notes yet
                  </div>
                ) : (
                  notes.map(note => (
                    <NoteMessage key={note.id} note={note} />
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default NotesChat
