'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ContentEmbed from '@/components/embeds/ContentEmbed'
import Navigation from '@/components/Navigation'

interface ContentItem {
  id: string
  platform: string
  platform_content_id: string
  url: string
  title?: string
  description?: string
  content?: string
  author_name?: string
  thumbnail_url?: string
  tags?: any
  content_created_at: string
  created_at: string
  metadata?: any
}

export default function EmbedPage() {
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState<string>('all')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 30

  useEffect(() => {
    fetchContent()
  }, [currentPage, platformFilter])

  async function fetchContent() {
    try {
      setLoading(true)

      // Build query
      let query = supabase
        .from('content')
        .select('*', { count: 'exact' })
        .order('content_created_at', { ascending: false })

      // Apply platform filter
      if (platformFilter !== 'all') {
        query = query.eq('platform', platformFilter)
      }

      // Get total count
      const { count } = await query

      setTotalCount(count || 0)

      // Get paginated data
      const offset = (currentPage - 1) * itemsPerPage
      const { data, error } = await query.range(offset, offset + itemsPerPage - 1)

      if (error) throw error

      setContent(data || [])
    } catch (error) {
      console.error('Error fetching content:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter content by search query
  const filteredContent = content.filter(item => {
    if (!searchQuery) return true

    const query = searchQuery.toLowerCase()
    const matchesText = (item.content || item.description || item.title || '').toLowerCase().includes(query)
    const matchesAuthor = (item.author_name || '').toLowerCase().includes(query)

    return matchesText || matchesAuthor
  })

  // Get platform counts
  const platformCounts = {
    all: totalCount,
    twitter: 0,
    youtube: 0,
    reddit: 0,
    bluesky: 0
  }

  // Calculate stats
  const totalItems = filteredContent.length
  const todayItems = filteredContent.filter(item => {
    const itemDate = new Date(item.content_created_at || item.created_at).toDateString()
    const today = new Date().toDateString()
    return itemDate === today
  }).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      {/* Navigation */}
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Search Bar */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Search content or authors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 focus:bg-white/10 transition-all backdrop-blur-sm"
          />
        </div>

        {/* Platform Filter */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Filter by Platform</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPlatformFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                platformFilter === 'all'
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10 hover:border-white/20'
              }`}
            >
              All Platforms
            </button>
            {['twitter', 'youtube', 'reddit', 'bluesky'].map((platform) => (
              <button
                key={platform}
                onClick={() => setPlatformFilter(platform)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  platformFilter === platform
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10 hover:border-white/20'
                }`}
              >
                {platform === 'twitter' && '𝕏 Twitter'}
                {platform === 'youtube' && '▶ YouTube'}
                {platform === 'reddit' && 'r/ Reddit'}
                {platform === 'bluesky' && '☁️ Bluesky'}
              </button>
            ))}
          </div>
        </div>

        {/* Content Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            <p className="mt-4 text-gray-400">Loading embeds...</p>
          </div>
        ) : filteredContent.length === 0 ? (
          <div className="text-center py-12 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-white mb-2">No content found</h3>
            <p className="text-gray-400">
              {content.length === 0
                ? 'No content available yet'
                : 'Try adjusting your filters or search query'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredContent.map((item) => (
              <ContentEmbed
                key={item.id}
                platform={item.platform}
                url={item.url}
                platformContentId={item.platform_content_id}
                title={item.title || item.description || item.content}
                author={item.author_name}
                tags={Array.isArray(item.tags) ? item.tags : []}
              />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && totalCount > itemsPerPage && (
          <div className="mt-12 flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                currentPage === 1
                  ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10 hover:border-purple-500/30'
              }`}
            >
              ← Previous
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: Math.ceil(totalCount / itemsPerPage) }, (_, i) => i + 1)
                .filter(page => {
                  const totalPages = Math.ceil(totalCount / itemsPerPage)
                  return (
                    page === 1 ||
                    page === totalPages ||
                    Math.abs(page - currentPage) <= 1
                  )
                })
                .map((page, index, array) => {
                  const prevPage = array[index - 1]
                  const showEllipsis = prevPage && page - prevPage > 1

                  return (
                    <div key={page} className="flex items-center gap-2">
                      {showEllipsis && (
                        <span className="text-gray-500 px-2">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          currentPage === page
                            ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10 hover:border-purple-500/30'
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  )
                })}
            </div>

            <button
              onClick={() => setCurrentPage(Math.min(Math.ceil(totalCount / itemsPerPage), currentPage + 1))}
              disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                currentPage >= Math.ceil(totalCount / itemsPerPage)
                  ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10 hover:border-purple-500/30'
              }`}
            >
              Next →
            </button>
          </div>
        )}

        {/* Page Info */}
        {!loading && totalCount > 0 && (
          <div className="mt-6 text-center text-sm text-gray-400">
            Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} items
          </div>
        )}
      </div>
    </div>
  )
}
