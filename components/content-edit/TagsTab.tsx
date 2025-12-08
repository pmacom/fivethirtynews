'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X, Tag } from 'lucide-react'
import { useContentEditStore } from './contentEditStore'

export function TagsTab() {
  const { availableTags, selectedTags, addTag, removeTag } = useContentEditStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter tags based on search query (min 3 chars)
  const filteredTags = searchQuery.length >= 3
    ? availableTags
        .filter(
          (tag) =>
            !selectedTags.has(tag.slug) &&
            (tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              tag.slug.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .slice(0, 10)
    : []

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle tag selection from dropdown
  const handleSelectTag = (slug: string) => {
    addTag(slug)
    setSearchQuery('')
    setShowDropdown(false)
    inputRef.current?.focus()
  }

  // Handle creating a new tag
  const handleCreateTag = () => {
    if (searchQuery.trim().length >= 2) {
      // Create slug from search query
      const slug = searchQuery.trim().toLowerCase().replace(/\s+/g, '-')
      addTag(slug)
      setSearchQuery('')
      setShowDropdown(false)
    }
  }

  // Get selected tag objects
  const selectedTagObjects = Array.from(selectedTags).map((slug) => {
    const tag = availableTags.find((t) => t.slug === slug)
    return tag || { id: slug, slug, name: slug }
  })

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus-within:border-zinc-500">
          <Search className="w-4 h-4 text-zinc-500" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setShowDropdown(true)
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search tags (type 3+ chars)..."
            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
          />
        </div>

        {/* Autocomplete dropdown */}
        {showDropdown && searchQuery.length >= 3 && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-10 overflow-hidden"
          >
            {filteredTags.length === 0 ? (
              <button
                onClick={handleCreateTag}
                className="w-full px-3 py-2.5 text-left text-sm hover:bg-zinc-700 transition-colors"
              >
                <span className="text-zinc-400">Create </span>
                <span className="text-green-400">"{searchQuery}"</span>
              </button>
            ) : (
              <>
                {filteredTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleSelectTag(tag.slug)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-zinc-700 transition-colors"
                  >
                    <span className="text-sm text-white">{tag.name}</span>
                    {tag.usage_count !== undefined && (
                      <span className="text-xs text-zinc-500">({tag.usage_count})</span>
                    )}
                  </button>
                ))}
                {/* Option to create new tag */}
                <button
                  onClick={handleCreateTag}
                  className="w-full px-3 py-2 text-left text-sm border-t border-zinc-700 hover:bg-zinc-700 transition-colors"
                >
                  <span className="text-zinc-400">Create </span>
                  <span className="text-green-400">"{searchQuery}"</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Selected tags */}
      <div>
        <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
          Selected Tags
        </div>
        {selectedTagObjects.length === 0 ? (
          <div className="text-sm text-zinc-500 py-4 text-center bg-zinc-800/50 rounded-lg">
            No tags added yet
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedTagObjects.map((tag) => (
              <span
                key={tag.slug}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/20 text-green-400 text-sm rounded-md"
              >
                <Tag className="w-3 h-3" />
                {tag.name}
                <button
                  onClick={() => removeTag(tag.slug)}
                  className="ml-0.5 hover:text-white transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Hint */}
      <p className="text-xs text-zinc-500">
        Type at least 3 characters to search existing tags or create a new one.
      </p>
    </div>
  )
}

export default TagsTab
