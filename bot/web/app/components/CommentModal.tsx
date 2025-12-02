'use client'

import { useEffect } from 'react'

interface Comment {
  id: string
  comment_text: string
  comment_url?: string
  author_name?: string
  author_username?: string
  author_avatar_url?: string
  likes_count?: number
  comment_created_at?: string
  saved_at: string
  platform: string
}

interface Content {
  id: string
  platform: string
  url: string
  title?: string
  description?: string
  content?: string
  author_name?: string
  thumbnail_url?: string
  tags?: any[]
  metadata?: any
}

interface CommentModalProps {
  content: Content
  comments: Comment[]
  onClose: () => void
}

export function CommentModal({ content, comments, onClose }: CommentModalProps) {
  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Format duration for videos
  const formatDuration = (seconds?: number) => {
    if (!seconds) return ''
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  }

  // Get platform display info
  const getPlatformInfo = (platform: string) => {
    switch (platform) {
      case 'youtube':
        return { icon: '▶', name: 'YouTube', color: 'bg-red-100 text-red-700' }
      case 'twitter':
        return { icon: '𝕏', name: 'X', color: 'bg-blue-100 text-blue-700' }
      case 'reddit':
        return { icon: 'r/', name: 'Reddit', color: 'bg-orange-100 text-orange-700' }
      case 'bluesky':
        return { icon: '☁️', name: 'Bluesky', color: 'bg-sky-100 text-sky-700' }
      default:
        return { icon: '🌐', name: platform, color: 'bg-gray-100 text-gray-700' }
    }
  }

  const platformInfo = getPlatformInfo(content.platform)
  const videoDuration = content.metadata?.duration

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Content & Comments</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
          {/* Content Preview */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-4">
              {/* Thumbnail */}
              {content.thumbnail_url && (
                <div className="relative flex-shrink-0 w-40 h-24 bg-gray-200 rounded overflow-hidden">
                  <img
                    src={content.thumbnail_url}
                    alt={content.title || 'Content thumbnail'}
                    className="w-full h-full object-cover"
                  />
                  {/* Video duration badge */}
                  {videoDuration && (
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black bg-opacity-80 text-white text-xs font-semibold rounded">
                      {formatDuration(videoDuration)}
                    </div>
                  )}
                </div>
              )}

              {/* Content info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${platformInfo.color}`}>
                    {platformInfo.icon} {platformInfo.name}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2">
                  {content.title || content.content || content.description || 'Untitled'}
                </h3>

                {content.author_name && (
                  <p className="text-sm text-gray-600 mb-2">
                    By {content.author_name}
                  </p>
                )}

                {/* Tags */}
                {content.tags && content.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {content.tags.map((tag: any, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium"
                      >
                        {typeof tag === 'string' ? tag : tag.tag || tag.name}
                      </span>
                    ))}
                  </div>
                )}

                <a
                  href={content.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  View Original →
                </a>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 mb-6"></div>

          {/* Comments Section */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              💬 {comments.length} Saved Comment{comments.length !== 1 ? 's' : ''}
            </h3>

            {comments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg mb-2">No comments saved yet</p>
                <p className="text-sm">
                  Use the 530 button on comments to save them here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => {
                  const commentPlatform = getPlatformInfo(comment.platform)
                  return (
                    <div
                      key={comment.id}
                      className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {/* Author avatar */}
                        {comment.author_avatar_url ? (
                          <img
                            src={comment.author_avatar_url}
                            alt={comment.author_name || 'Author'}
                            className="w-10 h-10 rounded-full flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-purple-700 font-bold text-sm">
                              {comment.author_name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                        )}

                        {/* Comment content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-gray-900">
                              {comment.author_name || comment.author_username || 'Anonymous'}
                            </span>
                            {comment.author_username && comment.author_name !== comment.author_username && (
                              <span className="text-xs text-gray-500">
                                @{comment.author_username}
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">
                            {comment.comment_text}
                          </p>

                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            {comment.likes_count !== undefined && comment.likes_count > 0 && (
                              <span className="flex items-center gap-1">
                                ❤️ {comment.likes_count.toLocaleString()}
                              </span>
                            )}
                            <span>
                              Saved {formatRelativeTime(comment.saved_at)}
                            </span>
                            {comment.comment_url && (
                              <a
                                href={comment.comment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-600 hover:text-purple-700 font-medium"
                              >
                                View on {commentPlatform.name} →
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
