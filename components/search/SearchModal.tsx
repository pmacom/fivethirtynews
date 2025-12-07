'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Tag, Loader2 } from 'lucide-react'
import SearchResultCard from './SearchResultCard'

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

interface TagOption {
  id: string
  slug: string
  name: string
}

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectContent?: (content: ContentItem) => void
  /** Mode: 'browse' for 2D pages, '3d-viewer' for 3D scene */
  mode?: 'browse' | '3d-viewer'
  /** Current content ID for relationship tracking (3D mode) */
  currentContentId?: string
  /** Callback when "Add to scene" is clicked (3D mode) */
  onAddToScene?: (content: ContentItem) => void
}

export default function SearchModal({
  isOpen,
  onClose,
  onSelectContent,
  mode = 'browse',
  currentContentId,
  onAddToScene,
}: SearchModalProps) {
  // Search state
  const [query, setQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagSearch, setTagSearch] = useState('')
  const [showTagDropdown, setShowTagDropdown] = useState(false)

  // Results state
  const [results, setResults] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)

  // Available tags
  const [availableTags, setAvailableTags] = useState<TagOption[]>([])
  const [tagsLoading, setTagsLoading] = useState(false)

  // Refs
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      // Reset state when closed
      setQuery('')
      setSelectedTags([])
      setResults([])
      setOffset(0)
      setHasMore(true)
    }
  }, [isOpen])

  // Fetch available tags
  useEffect(() => {
    async function fetchTags() {
      setTagsLoading(true)
      try {
        const res = await fetch('/api/tags')
        const data = await res.json()
        if (data.success) {
          setAvailableTags(data.tags)
        }
      } catch (err) {
        console.error('Failed to fetch tags:', err)
      } finally {
        setTagsLoading(false)
      }
    }
    fetchTags()
  }, [])

  // Search function
  const performSearch = useCallback(
    async (searchQuery: string, tags: string[], searchOffset: number, append: boolean = false) => {
      if (!searchQuery && tags.length === 0) {
        setResults([])
        setTotal(0)
        setHasMore(false)
        return
      }

      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      try {
        const params = new URLSearchParams()
        if (searchQuery) params.set('q', searchQuery)
        if (tags.length > 0) params.set('tags', tags.join(','))
        params.set('limit', '20')
        params.set('offset', searchOffset.toString())

        const res = await fetch(`/api/content/search?${params}`)
        const data = await res.json()

        if (data.success) {
          setResults((prev) => (append ? [...prev, ...data.data] : data.data))
          setTotal(data.pagination.total)
          setHasMore(data.pagination.hasMore)
          setOffset(searchOffset)
        }
      } catch (err) {
        console.error('Search failed:', err)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    []
  )

  // Debounced search on query/tags change
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query, selectedTags, 0, false)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, selectedTags, performSearch])

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          performSearch(query, selectedTags, offset + 20, true)
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, query, selectedTags, offset, performSearch])

  // Filter tags for dropdown
  const filteredTags = availableTags.filter(
    (tag) =>
      !selectedTags.includes(tag.slug) &&
      (tag.name.toLowerCase().includes(tagSearch.toLowerCase()) ||
        tag.slug.toLowerCase().includes(tagSearch.toLowerCase()))
  )

  // Handle tag selection
  const addTag = (slug: string) => {
    setSelectedTags((prev) => [...prev, slug])
    setTagSearch('')
    setShowTagDropdown(false)
  }

  const removeTag = (slug: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== slug))
  }

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTagDropdown) {
          setShowTagDropdown(false)
        } else {
          onClose()
        }
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, showTagDropdown, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Search Header */}
        <div className="p-4 border-b border-zinc-800">
          {/* Main search input */}
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-zinc-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search content..."
              className="flex-1 bg-transparent text-white text-lg placeholder-zinc-500 outline-none"
            />
            {(query || selectedTags.length > 0) && (
              <button
                onClick={() => {
                  setQuery('')
                  setSelectedTags([])
                }}
                className="p-1 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Selected tags */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedTags.map((slug) => {
                const tag = availableTags.find((t) => t.slug === slug)
                return (
                  <span
                    key={slug}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 text-sm rounded-md"
                  >
                    <Tag className="w-3 h-3" />
                    {tag?.name || slug}
                    <button
                      onClick={() => removeTag(slug)}
                      className="ml-1 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )
              })}
            </div>
          )}

          {/* Tag search input */}
          <div className="relative mt-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={tagSearch}
                onChange={(e) => {
                  setTagSearch(e.target.value)
                  setShowTagDropdown(true)
                }}
                onFocus={() => setShowTagDropdown(true)}
                placeholder="Filter by tags..."
                className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
              />
            </div>

            {/* Tag dropdown */}
            {showTagDropdown && (tagSearch || filteredTags.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-2 max-h-48 overflow-y-auto bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-10">
                {tagsLoading ? (
                  <div className="p-3 text-center text-zinc-500">
                    <Loader2 className="w-4 h-4 animate-spin inline" />
                  </div>
                ) : filteredTags.length === 0 ? (
                  <div className="p-3 text-center text-zinc-500 text-sm">
                    No matching tags
                  </div>
                ) : (
                  filteredTags.slice(0, 20).map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => addTag(tag.slug)}
                      className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
                    >
                      {tag.name}
                      <span className="text-zinc-500 ml-2">({tag.slug})</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div
          ref={resultsRef}
          className="max-h-[60vh] overflow-y-auto"
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-green-500" />
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-zinc-500">
              {query || selectedTags.length > 0
                ? 'No results found'
                : 'Start typing to search'}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {/* Results count */}
              <div className="px-2 py-1 text-xs text-zinc-500">
                {total} result{total !== 1 ? 's' : ''}
              </div>

              {/* Result cards */}
              {results.map((item) => (
                <SearchResultCard
                  key={item.id}
                  content={item}
                  onClick={() => onSelectContent?.(item)}
                  mode={mode}
                  onAddToScene={onAddToScene ? () => onAddToScene(item) : undefined}
                />
              ))}

              {/* Load more trigger */}
              {hasMore && (
                <div ref={loadMoreRef} className="py-4 flex justify-center">
                  {loadingMore && (
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                  )}
                </div>
              )}

              {/* End of results */}
              {!hasMore && results.length > 0 && (
                <div className="py-4 text-center text-zinc-600 text-sm">
                  End of results
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <span>
            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">↵</kbd> to select
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  )
}
