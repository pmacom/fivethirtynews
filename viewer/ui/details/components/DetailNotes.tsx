import { LiveViewContentBlockItems } from '@/viewer/core/content/types'
import React from 'react'
import { useTweetStore } from '@/viewer/core/store/contentStore'

interface DetailNotesProps {
  data: LiveViewContentBlockItems
}

export const DetailNotes = ({ data }: DetailNotesProps) => {
  const { content, note } = data
  const getTweet = useTweetStore(state => state.getTweet)

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

      {/* Right: Content text - takes remaining space */}
      {displayText && (
        <div className="flex-1 min-w-0 border-l border-white/20 pl-3">
          <p className="text-sm text-slate-300 leading-relaxed line-clamp-2">
            {displayText}
          </p>
        </div>
      )}
    </div>
  )
}

export default DetailNotes