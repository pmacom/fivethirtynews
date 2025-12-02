import { Separator } from '@/components/ui/separator'
import { LiveViewContentBlockItems } from '@/viewer/core/content/types'
import React from 'react'
import DateDisplay from './DateDisplay'
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

  // Date fallback: prefer content_created_at, fall back to submitted_at
  const displayDate = content.content_created_at || content.submitted_at

  return (
    <div className="grow pl-2 flex flex-col gap-2">
      {/* Top row: Author info + Date */}
      <div className="flex items-start justify-between gap-4">
        {/* Author section */}
        {hasAuthor && (
          <div className="flex items-center gap-2">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={authorName || authorUsername || 'Author'}
                className="w-8 h-8 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs">
                {(authorName || authorUsername || '?')[0].toUpperCase()}
              </div>
            )}
            <div className="flex flex-col">
              {authorName && (
                <span className="text-sm font-medium text-white">
                  {authorName}
                </span>
              )}
              {authorUsername && (
                <span className="text-xs text-slate-400">
                  @{authorUsername}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Date section - aligned right (with fallback to submitted_at) */}
        <DateDisplay dateString={displayDate} />
      </div>

      {/* Note or description (single text, not both) */}
      {displayText && (
        <>
          {hasAuthor && <Separator className="opacity-30" />}
          <div className="text-sm text-slate-300 leading-relaxed line-clamp-2">
            {displayText}
          </div>
        </>
      )}
    </div>
  )
}

export default DetailNotes