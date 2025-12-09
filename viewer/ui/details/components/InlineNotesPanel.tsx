'use client'

import React, { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Send, Loader2 } from 'lucide-react'
import { useCurrentUser } from '../../../hooks/useCurrentUser'
import { useNotesStore, Note } from '../../notes/notesStore'
import { useUIStore } from '../../store'

const MAX_NOTE_LENGTH = 280

interface InlineNotesPanelProps {
  contentId: string
  onClose: () => void
  onInputFocusChange?: (isFocused: boolean) => void
}

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

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Get Discord avatar URL or fallback
 */
function getAvatarUrl(user: Note['user']): string {
  if (user?.discord_avatar) {
    if (user.discord_avatar.startsWith('http')) {
      return user.discord_avatar
    }
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.discord_avatar}.png`
  }
  return `https://cdn.discordapp.com/embed/avatars/0.png`
}

/**
 * Single chat message
 */
function ChatMessage({ note }: { note: Note }) {
  const avatarUrl = getAvatarUrl(note.user)
  const displayName = note.user?.display_name || note.author_name || 'Anonymous'

  return (
    <div className="flex gap-2">
      <img
        src={avatarUrl}
        alt={displayName}
        className="w-7 h-7 rounded-full flex-shrink-0 ring-1 ring-white/10"
        onError={(e) => {
          e.currentTarget.src = `https://cdn.discordapp.com/embed/avatars/0.png`
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium text-white/70 truncate">
            {displayName}
          </span>
          <span className="text-[10px] text-white/40 flex-shrink-0">
            {formatRelativeTime(note.created_at)}
          </span>
        </div>
        <div className="mt-0.5 text-sm text-white/90 leading-snug">
          {note.note_text}
        </div>
      </div>
    </div>
  )
}

export function InlineNotesPanel({ contentId, onClose, onInputFocusChange }: InlineNotesPanelProps) {
  const { canEdit } = useCurrentUser()
  const { notes, loading, fetchNotes } = useNotesStore()
  const setPreventFade = useUIStore(state => state.setPreventFade)
  const [noteText, setNoteText] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const remainingChars = MAX_NOTE_LENGTH - noteText.length
  const isOverLimit = remainingChars < 0
  const canSend = noteText.trim().length > 0 && !isOverLimit && !sending

  // Sort notes chronologically (oldest first for chat flow)
  const sortedNotes = [...notes].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  // Fetch notes on mount
  useEffect(() => {
    if (contentId) {
      fetchNotes(contentId)
    }
  }, [contentId, fetchNotes])

  // Scroll to bottom when notes change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [notes])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 80)}px`
    }
  }, [noteText])

  // Send note
  const handleSend = async () => {
    if (!canSend) return

    setSending(true)
    try {
      const res = await fetch(`/api/content/${contentId}/notes`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_text: noteText.trim() }),
      })

      const data = await res.json()
      if (data.success) {
        setNoteText('')
        // Refetch to get the new note
        fetchNotes(contentId)
      }
    } catch (err) {
      console.error('Failed to send note:', err)
    } finally {
      setSending(false)
    }
  }

  // Handle Enter key to send
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="fixed right-4 top-1/2 -translate-y-1/2 w-[280px] md:w-[320px] h-[50vh] max-h-[500px] min-h-[200px] z-[110] bg-black/90 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="text-sm font-medium text-white">
          Notes {notes.length > 0 && <span className="text-white/50">({notes.length})</span>}
        </span>
        <button
          onClick={onClose}
          className="p-1 text-white/50 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[100px]">
        {loading ? (
          <div className="flex items-center justify-center h-full py-8">
            <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
          </div>
        ) : sortedNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <div className="text-white/30 text-2xl mb-2">💬</div>
            <p className="text-white/40 text-xs">No notes yet</p>
          </div>
        ) : (
          <>
            {sortedNotes.map((note) => (
              <ChatMessage key={note.id} note={note} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area - only for admin/mods */}
      {canEdit && (
        <div className="border-t border-white/10 p-2">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  onInputFocusChange?.(true)
                  setPreventFade(true)  // Block global UI fade while typing
                }}
                onBlur={() => {
                  onInputFocusChange?.(false)
                  setPreventFade(false)  // Resume normal fade behavior
                }}
                placeholder="Add a note..."
                rows={1}
                disabled={sending}
                className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-sm text-white placeholder-white/30 outline-none resize-none transition-colors disabled:opacity-50 ${
                  isOverLimit
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-white/10 focus:border-white/30'
                }`}
                maxLength={MAX_NOTE_LENGTH + 50}
              />
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={`p-2 rounded-full transition-colors flex-shrink-0 ${
                canSend
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Character count - only show when typing */}
          {noteText.length > 0 && (
            <div
              className={`text-[10px] text-right mt-1 ${
                isOverLimit
                  ? 'text-red-400'
                  : remainingChars <= 20
                  ? 'text-yellow-400'
                  : 'text-white/30'
              }`}
            >
              {remainingChars}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

export default InlineNotesPanel
