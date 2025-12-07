'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search } from 'lucide-react'
import SearchModal from './SearchModal'

interface ContentItem {
  id: string
  title: string | null
  description: string | null
  url: string
  thumbnail_url: string | null
  platform: string
  platform_content_id?: string
  author_name: string | null
  author_username: string | null
  content_created_at: string
  created_at: string
  primary_channel?: string
  channels?: string[]
  tags?: string[]
}

interface SearchTriggerProps {
  onSelectContent?: (content: ContentItem) => void
  variant?: 'button' | 'input'
  className?: string
}

export default function SearchTrigger({
  onSelectContent,
  variant = 'button',
  className = '',
}: SearchTriggerProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSelect = useCallback(
    (content: ContentItem) => {
      onSelectContent?.(content)
      setIsOpen(false)
    },
    [onSelectContent]
  )

  // Detect OS for shortcut display
  const [isMac, setIsMac] = useState(true)
  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0)
  }, [])

  const shortcutText = isMac ? '⌘K' : 'Ctrl+K'

  if (variant === 'input') {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className={`
            flex items-center gap-2 w-full px-3 py-2
            bg-zinc-800/50 hover:bg-zinc-800
            border border-zinc-700 hover:border-zinc-600
            rounded-lg text-zinc-400 text-sm
            transition-colors cursor-text
            ${className}
          `}
        >
          <Search className="w-4 h-4" />
          <span className="flex-1 text-left">Search content...</span>
          <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-xs bg-zinc-700/50 border border-zinc-600 rounded">
            {shortcutText}
          </kbd>
        </button>

        <SearchModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSelectContent={handleSelect}
        />
      </>
    )
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`
          inline-flex items-center gap-2 px-3 py-2
          bg-zinc-800/50 hover:bg-zinc-800
          border border-zinc-700 hover:border-zinc-600
          rounded-lg text-zinc-400 hover:text-white
          transition-colors
          ${className}
        `}
        title={`Search (${shortcutText})`}
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline text-sm">Search</span>
        <kbd className="hidden md:inline-flex px-1.5 py-0.5 text-xs bg-zinc-700/50 border border-zinc-600 rounded">
          {shortcutText}
        </kbd>
      </button>

      <SearchModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSelectContent={handleSelect}
      />
    </>
  )
}
