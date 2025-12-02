'use client'

import { useEffect, useState } from 'react'
import { supabase, TaggedPost, TAG_CATEGORIES } from '@/lib/supabase'
import { CommentModal } from './components/CommentModal'
import Navigation from '@/components/Navigation'

export default function Home() {
  const [posts, setPosts] = useState<TaggedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState<string | null>(null)
  const [modalComments, setModalComments] = useState<any[]>([])
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 30

  useEffect(() => {
    fetchPosts()
  }, [currentPage])

  // Fetch comment counts when posts change
  useEffect(() => {
    if (posts.length > 0) {
      fetchCommentCounts()
    }
  }, [posts])

  // Fetch comment counts for all posts
  async function fetchCommentCounts() {
    try {
      const counts: Record<string, number> = {}
      for (const post of posts) {
        const response = await fetch(`/api/comments?contentId=${post.id}`)
        const result = await response.json()
        if (result.success) {
          counts[post.id] = result.count || 0
        }
      }
      setCommentCounts(counts)
    } catch (error) {
      console.error('Error fetching comment counts:', error)
    }
  }

  // Open modal and fetch comments for a specific post
  async function openCommentModal(contentId: string) {
    try {
      const response = await fetch(`/api/comments?contentId=${contentId}`)
      const result = await response.json()
      if (result.success) {
        setModalComments(result.data || [])
        setModalOpen(contentId)
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  // Close modal
  function closeCommentModal() {
    setModalOpen(null)
    setModalComments([])
  }

  async function fetchPosts() {
    try {
      setLoading(true)

      // Fetch total count
      const { count, error: countError } = await supabase
        .from('content')
        .select('*', { count: 'exact', head: true })

      if (countError) throw countError
      setTotalCount(count || 0)

      // Fetch paginated data
      const offset = (currentPage - 1) * itemsPerPage
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .order('content_created_at', { ascending: false })
        .range(offset, offset + itemsPerPage - 1)

      if (error) throw error

      // Transform content to match TaggedPost format for now
      const transformedPosts = (data || []).map(content => ({
        id: content.id,
        tweet_id: content.platform_content_id,
        tweetText: content.content || content.description || content.title || '',
        author: content.author_name || 'Unknown',
        url: content.url,
        thumbnail_url: content.thumbnail_url,
        media_assets: content.media_assets || [],
        timestamp: content.content_created_at || content.created_at,
        tags: content.tags || [],
        categories: {}, // TODO: map tags to categories
        platform: content.platform,
        metadata: content.metadata || {}
      }))

      setPosts(transformedPosts as any)
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter posts
  const filteredPosts = posts.filter(post => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesText = post.tweetText.toLowerCase().includes(query)
      const matchesAuthor = post.author.toLowerCase().includes(query)
      if (!matchesText && !matchesAuthor) return false
    }

    // Category filter
    if (selectedCategory && post.categories) {
      if (!post.categories[selectedCategory]) return false
    }

    // Tag filter
    if (selectedTag && Array.isArray(post.tags)) {
      const hasTag = post.tags.some(t => t.tag === selectedTag)
      if (!hasTag) return false
    }

    return true
  })

  // Calculate stats
  const totalPosts = posts.length
  const todayPosts = posts.filter(post => {
    const postDate = new Date(post.timestamp).toDateString()
    const today = new Date().toDateString()
    return postDate === today
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
            placeholder="Search posts or authors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 focus:bg-white/10 transition-all backdrop-blur-sm"
          />
        </div>

        {/* Filters */}
        <div className="mb-8 space-y-4">
          {/* Category Filter */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Filter by Category</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedCategory === null
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10 hover:border-white/20'
                }`}
              >
                All
              </button>
              {Object.entries(TAG_CATEGORIES).map(([key, category]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedCategory === key
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10 hover:border-white/20'
                  }`}
                >
                  {category.icon} {category.title}
                </button>
              ))}
            </div>
          </div>

          {/* Tag Filter */}
          {selectedCategory && TAG_CATEGORIES[selectedCategory] && (
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Filter by Tag</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedTag(null)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedTag === null
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10 hover:border-white/20'
                  }`}
                >
                  All {TAG_CATEGORIES[selectedCategory].title}
                </button>
                {TAG_CATEGORIES[selectedCategory].tags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      selectedTag === tag
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10 hover:border-white/20'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            <p className="mt-4 text-gray-400">Loading posts...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-12 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
            <div className="text-6xl mb-4">🏷️</div>
            <h3 className="text-xl font-semibold text-white mb-2">No posts found</h3>
            <p className="text-gray-400">
              {posts.length === 0
                ? 'Start tagging posts with your Chrome extension!'
                : 'Try adjusting your filters or search query'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className="bg-white/5 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-purple-500/20 transition-all overflow-hidden border border-white/10 hover:border-purple-500/30 group"
              >
                {/* Image Gallery / Video Player */}
                {(() => {
                  const mediaAssets = (post as any).media_assets || [];
                  const images = mediaAssets.filter((asset: any) => asset.type === 'image');
                  const videos = mediaAssets.filter((asset: any) => asset.type === 'video');

                  // Check if this is primarily a video (YouTube, or has video assets)
                  const isVideo = (post as any).platform === 'youtube' || videos.length > 0;
                  const primaryVideo = videos.length > 0 ? videos[0] : null;

                  // ROBUST THUMBNAIL FALLBACK CHAIN
                  // Priority: mediaAssets images → thumbnail_url → platform-specific generation
                  let imageUrls: string[] = [];

                  if (images.length > 0) {
                    // Priority 1: Use images from mediaAssets array
                    imageUrls = images.map((img: any) => img.url);
                    console.log('530: Using mediaAssets images:', imageUrls);
                  } else if (post.thumbnail_url) {
                    // Priority 2: Use thumbnail_url field
                    imageUrls = [post.thumbnail_url];
                    console.log('530: Using thumbnail_url:', post.thumbnail_url);
                  } else if (isVideo) {
                    // Priority 3: Generate platform-specific thumbnail URL for videos
                    const videoId = post.tweet_id || post.id.split(':')[1];
                    if ((post as any).platform === 'youtube' && videoId) {
                      // Use hqdefault as it's reliably available for all YouTube videos
                      imageUrls = [`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`];
                      console.log('530: Generated YouTube thumbnail:', imageUrls[0]);
                    }
                  }

                  console.log('530: Final imageUrls for', post.id, ':', imageUrls);

                  // Only hide thumbnail if no images AND not a video platform
                  if (imageUrls.length === 0 && !isVideo) return null;

                  // Helper function to format duration (seconds to MM:SS or HH:MM:SS)
                  const formatDuration = (seconds: number) => {
                    if (!seconds) return '';
                    const hours = Math.floor(seconds / 3600);
                    const minutes = Math.floor((seconds % 3600) / 60);
                    const secs = seconds % 60;
                    if (hours > 0) {
                      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                    }
                    return `${minutes}:${secs.toString().padStart(2, '0')}`;
                  };

                  return (
                    <div className="relative w-full h-48 bg-black/40">
                      {isVideo ? (
                        // Video thumbnail with play button overlay - clickable to open YouTube
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative w-full h-full group cursor-pointer block"
                        >
                          {imageUrls.length > 0 ? (
                            <img
                              src={imageUrls[0]}
                              alt={post.tweetText || 'Video thumbnail'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Final fallback: show gray placeholder with video icon
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.style.background = 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
                                }
                              }}
                            />
                          ) : (
                            // Fallback: Gray background with centered video icon
                            <div className="w-full h-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">
                              <div className="text-white text-6xl opacity-50">▶</div>
                            </div>
                          )}
                          {/* Play button overlay */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 group-hover:bg-opacity-40 transition-all">
                            <div className="w-16 h-16 rounded-full bg-white bg-opacity-90 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-gray-800 border-b-8 border-b-transparent ml-1"></div>
                            </div>
                          </div>
                          {/* Duration badge */}
                          {primaryVideo?.duration && (
                            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black bg-opacity-80 text-white text-xs font-semibold rounded">
                              {formatDuration(primaryVideo.duration)}
                            </div>
                          )}
                        </a>
                      ) : imageUrls.length === 1 ? (
                        // Single image
                        <img
                          src={imageUrls[0]}
                          alt={post.tweetText || 'Content thumbnail'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        // Multiple images grid
                        <div className={`grid gap-0.5 w-full h-full ${
                          imageUrls.length === 2 ? 'grid-cols-2' :
                          imageUrls.length === 3 ? 'grid-cols-3' :
                          'grid-cols-2 grid-rows-2'
                        }`}>
                          {imageUrls.slice(0, 4).map((url: string, idx: number) => (
                            <div key={idx} className="relative overflow-hidden">
                              <img
                                src={url}
                                alt={`${post.tweetText || 'Content'} - Image ${idx + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              {/* Show count overlay on last image if more than 4 */}
                              {idx === 3 && imageUrls.length > 4 && (
                                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                                  <span className="text-white text-2xl font-bold">+{imageUrls.length - 4}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Platform badge overlay */}
                      {(post as any).platform && (
                        <span className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium shadow-sm ${
                          (post as any).platform === 'twitter' ? 'bg-blue-100 text-blue-700' :
                          (post as any).platform === 'youtube' ? 'bg-red-100 text-red-700' :
                          (post as any).platform === 'reddit' ? 'bg-orange-100 text-orange-700' :
                          (post as any).platform === 'bluesky' ? 'bg-sky-100 text-sky-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {(post as any).platform === 'twitter' ? '𝕏' :
                           (post as any).platform === 'youtube' ? '▶' :
                           (post as any).platform === 'reddit' ? 'r/' :
                           (post as any).platform === 'bluesky' ? '☁️' :
                           (post as any).platform}
                        </span>
                      )}
                    </div>
                  );
                })()}

                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white text-sm">{post.author}</h3>
                      {/* Platform badge (only show if no thumbnail) */}
                      {!post.thumbnail_url && (post as any).platform && (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          (post as any).platform === 'twitter' ? 'bg-blue-500/20 text-blue-300' :
                          (post as any).platform === 'youtube' ? 'bg-red-500/20 text-red-300' :
                          (post as any).platform === 'reddit' ? 'bg-orange-500/20 text-orange-300' :
                          (post as any).platform === 'bluesky' ? 'bg-sky-500/20 text-sky-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {(post as any).platform === 'twitter' ? '𝕏' :
                           (post as any).platform === 'youtube' ? '▶' :
                           (post as any).platform === 'reddit' ? 'r/' :
                           (post as any).platform === 'bluesky' ? '☁️' :
                           (post as any).platform}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(post.timestamp).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                    {post.tweetText}
                  </p>

                  {/* Tags */}
                  {Array.isArray(post.tags) && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {post.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-md text-xs font-medium border border-purple-500/30"
                        >
                          {typeof tag === 'string' ? tag : (tag as any).tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-purple-400 hover:text-purple-300 font-medium transition-colors"
                    >
                      {(post as any).platform === 'youtube' ? 'Watch on YouTube' :
                       (post as any).platform === 'reddit' ? 'View on Reddit' :
                       (post as any).platform === 'bluesky' ? 'View on Bluesky' :
                       'View on X'} →
                    </a>

                    {/* Comment count badge */}
                    {commentCounts[post.id] > 0 && (
                      <button
                        onClick={() => openCommentModal(post.id)}
                        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-purple-400 font-medium transition-colors"
                      >
                        💬 {commentCounts[post.id]} comment{commentCounts[post.id] !== 1 ? 's' : ''}
                      </button>
                    )}
                  </div>
                </div>
              </div>
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
                  // Show first page, last page, current page, and pages around current
                  const totalPages = Math.ceil(totalCount / itemsPerPage)
                  return (
                    page === 1 ||
                    page === totalPages ||
                    Math.abs(page - currentPage) <= 1
                  )
                })
                .map((page, index, array) => {
                  // Add ellipsis between non-consecutive pages
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
            Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} posts
          </div>
        )}
      </div>

      {/* Comment Modal */}
      {modalOpen && (
        <CommentModal
          content={posts.find(p => p.id === modalOpen) as any}
          comments={modalComments}
          onClose={closeCommentModal}
        />
      )}
    </div>
  )
}
