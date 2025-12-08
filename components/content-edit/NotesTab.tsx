'use client'

import { useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { useContentEditStore, ContentNote } from './contentEditStore'

const MAX_NOTE_LENGTH = 280

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
function getAvatarUrl(user: ContentNote['user']): string {
  if (user?.discord_avatar) {
    if (user.discord_avatar.startsWith('http')) {
      return user.discord_avatar
    }
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.discord_avatar}.png`
  }
  return `https://cdn.discordapp.com/embed/avatars/0.png`
}

/**
 * Single chat message bubble
 */
function ChatMessage({ note }: { note: ContentNote }) {
  const avatarUrl = getAvatarUrl(note.user)
  const displayName = note.user?.display_name || note.author_name || 'Anonymous'

  return (
    <div className="flex gap-2.5">
      <img
        src={avatarUrl}
        alt={displayName}
        className="w-8 h-8 rounded-full flex-shrink-0 ring-1 ring-white/10"
        onError={(e) => {
          e.currentTarget.src = `https://cdn.discordapp.com/embed/avatars/0.png`
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium text-zinc-400 truncate">
            {displayName}
          </span>
          <span className="text-xs text-zinc-600 flex-shrink-0">
            {formatRelativeTime(note.created_at)}
          </span>
        </div>
        <div className="mt-1 px-3 py-2 rounded-2xl rounded-tl-sm text-sm bg-zinc-800 text-zinc-200 inline-block max-w-[90%]">
          {note.note_text}
        </div>
      </div>
    </div>
  )
}

export function NotesTab() {
  const { noteText, setNoteText, allNotes, sendingNote, sendNote } = useContentEditStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const remainingChars = MAX_NOTE_LENGTH - noteText.length
  const isOverLimit = remainingChars < 0
  const canSend = noteText.trim().length > 0 && !isOverLimit && !sendingNote

  // Sort notes chronologically (oldest first for chat flow)
  const sortedNotes = [...allNotes].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  // Scroll to bottom when notes change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [allNotes])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`
    }
  }, [noteText])

  // Handle send
  const handleSend = async () => {
    if (!canSend) return
    await sendNote()
  }

  // Handle Enter key to send (Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full -m-4">
      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {sortedNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="text-zinc-600 text-4xl mb-3">💬</div>
            <p className="text-zinc-500 text-sm">No notes yet</p>
            <p className="text-zinc-600 text-xs mt-1">Be the first to add a note about this content</p>
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

      {/* Message input area - fixed at bottom */}
      <div className="border-t border-zinc-800 bg-zinc-900/80 p-3">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a note..."
              rows={1}
              disabled={sendingNote}
              className={`w-full px-4 py-2.5 bg-zinc-800 border rounded-2xl text-sm text-white placeholder-zinc-500 outline-none resize-none transition-colors disabled:opacity-50 ${
                isOverLimit
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-zinc-700 focus:border-zinc-600'
              }`}
              maxLength={MAX_NOTE_LENGTH + 50}
            />
          </div>

          {/* Character count */}
          <div
            className={`text-xs tabular-nums min-w-[2rem] text-center ${
              isOverLimit
                ? 'text-red-400'
                : remainingChars <= 20
                ? 'text-yellow-400'
                : 'text-zinc-600'
            }`}
          >
            {remainingChars}
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={`p-2.5 rounded-full transition-colors ${
              canSend
                ? 'bg-green-600 hover:bg-green-500 text-white'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            }`}
          >
            {sendingNote ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        <p className="text-xs text-zinc-600 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}

export default NotesTab
