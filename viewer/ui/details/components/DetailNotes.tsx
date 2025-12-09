import { LiveViewContentBlockItems } from '@/viewer/core/content/types'
import React, { useRef, useState, useEffect } from 'react'
import { useTweetStore } from '@/viewer/core/store/contentStore'
import { ChevronDown } from 'lucide-react'

interface DetailNotesProps {
  data: LiveViewContentBlockItems
}

export const DetailNotes = ({ data }: DetailNotesProps) => {
  const { content, note } = data
  const getTweet = useTweetStore(state => state.getTweet)
  const contentRef = useRef<HTMLDivElement>(null)
  const [hasOverflow, setHasOverflow] = useState(false)

  // For Twitter content, get tweet data as fallback for missing fields
  const tweetData = content.content_type === 'twitter' && content.content_id
    ? getTweet(content.content_id)?.data
    : null

  // Author info with fallbacks to tweet data
  const authorName = content.author_name || tweetData?.user?.name
  const authorUsername = content.author_username || tweetData?.user?.screen_name
  const avatarUrl = content.author_avatar_url || tweetData?.user?.profile_image_url_https
  const hasAuthor = authorName || authorUsername

  // Show note if available, otherwise show description, then tweet text
  const displayText = note || content.description || tweetData?.text

  // Detect if content overflows
  useEffect(() => {
    if (contentRef.current) {
      setHasOverflow(contentRef.current.scrollHeight > contentRef.current.clientHeight)
    }
  }, [displayText])

  return (
    <div className="grow flex items-center gap-3 min-w-0">
      {/* Left: Avatar + Author info */}
      {hasAuthor && (
        <div className="flex items-center gap-2 shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={authorName || authorUsername || 'Author'}
              className="w-9 h-9 rounded-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-slate-600 flex items-center justify-center text-sm text-white">
              {(authorName || authorUsername || '?')[0].toUpperCase()}
            </div>
          )}
          <div className="flex flex-col">
            {authorName && (
              <span className="text-sm font-medium text-white whitespace-nowrap">
                {authorName}
              </span>
            )}
            {authorUsername && (
              <span className="text-xs text-slate-400 whitespace-nowrap">
                @{authorUsername}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Right: Content text - 4 lines, scrollable on hover */}
      {displayText && (
        <div className="group flex-1 min-w-0 border-l border-white/20 pl-3 relative">
          {/* Scrollable content area */}
          <div
            ref={contentRef}
            className="max-h-[96px] overflow-hidden hover:overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
          >
            <p className="text-sm text-slate-300 leading-relaxed text-left pr-4">
              {displayText}
            </p>
          </div>

          {/* Fade gradient at bottom (hides when hovering to scroll) */}
          {hasOverflow && (
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black/80 to-transparent pointer-events-none group-hover:opacity-0 transition-opacity" />
          )}

          {/* Scroll indicator (visible when content overflows) */}
          {hasOverflow && (
            <div className="absolute bottom-1 right-1 text-white/40 group-hover:opacity-0 transition-opacity">
              <ChevronDown className="w-4 h-4 animate-bounce" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DetailNotes