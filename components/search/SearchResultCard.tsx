'use client'

import { ExternalLink, Twitter, Youtube, Globe, Plus } from 'lucide-react'

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

interface SearchResultCardProps {
  content: ContentItem
  onClick?: () => void
  isSelected?: boolean
  /** Mode: 'browse' for 2D pages, '3d-viewer' for 3D scene */
  mode?: 'browse' | '3d-viewer'
  /** Callback when "Add to scene" is clicked (3D mode only) */
  onAddToScene?: () => void
}

const PlatformIcon = ({ platform }: { platform: string }) => {
  switch (platform) {
    case 'twitter':
      return <Twitter className="w-4 h-4" />
    case 'youtube':
      return <Youtube className="w-4 h-4" />
    default:
      return <Globe className="w-4 h-4" />
  }
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60))
      return `${diffMins}m ago`
    }
    return `${diffHours}h ago`
  }
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export default function SearchResultCard({
  content,
  onClick,
  isSelected = false,
  mode = 'browse',
  onAddToScene,
}: SearchResultCardProps) {
  const is3DMode = mode === '3d-viewer'
  // Combine tags for display (limit to 3)
  const displayTags = [
    ...(content.primary_channel ? [content.primary_channel] : []),
    ...(content.channels || []).filter((c) => c !== content.primary_channel),
    ...(content.tags || []),
  ]
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 3)

  return (
    <div
      onClick={onClick}
      className={`
        group flex gap-3 p-3 rounded-lg cursor-pointer transition-all
        ${isSelected
          ? 'bg-green-500/20 border border-green-500/40'
          : 'bg-zinc-800/50 hover:bg-zinc-800 border border-transparent hover:border-zinc-700'
        }
      `}
    >
      {/* Thumbnail */}
      {content.thumbnail_url ? (
        <div className="flex-shrink-0 w-24 h-16 rounded-md overflow-hidden bg-zinc-700">
          <img
            src={content.thumbnail_url}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="flex-shrink-0 w-24 h-16 rounded-md bg-zinc-700/50 flex items-center justify-center">
          <PlatformIcon platform={content.platform} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <h4 className="font-medium text-white text-sm line-clamp-1 mb-1">
          {content.title || content.description?.slice(0, 60) || 'Untitled'}
        </h4>

        {/* Description */}
        {content.description && (
          <p className="text-xs text-zinc-400 line-clamp-1 mb-2">
            {content.description}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <PlatformIcon platform={content.platform} />
          {content.author_username && (
            <span className="text-zinc-400">@{content.author_username}</span>
          )}
          <span>{formatDate(content.content_created_at || content.created_at)}</span>
        </div>

        {/* Tags */}
        {displayTags.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {displayTags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 text-[10px] bg-zinc-700/50 text-zinc-400 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex-shrink-0 flex items-center gap-1">
        {/* Add to scene button (3D mode only) */}
        {is3DMode && onAddToScene && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAddToScene()
            }}
            className="p-2 text-zinc-500 hover:text-green-400 hover:bg-green-500/10 rounded-md transition-colors"
            title="Add to scene"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}

        {/* External link icon */}
        <a
          href={content.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-2 text-zinc-500 hover:text-green-400 transition-colors opacity-0 group-hover:opacity-100"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  )
}
