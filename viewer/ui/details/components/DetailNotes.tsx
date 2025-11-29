import { Separator } from '@/components/ui/separator'
import { LiveViewContentBlockItems } from '@/viewer/core/content/types'
import React from 'react'

interface DetailNotesProps {
  data: LiveViewContentBlockItems
}

export const DetailNotes = ({ data }: DetailNotesProps) => {
  const { content, note } = data
  const hasAuthor = content.author_name || content.author_username

  return (
    <div className="grow pl-2 flex flex-col gap-2">
      {hasAuthor && (
        <div className="flex items-center gap-2">
          {content.author_avatar_url ? (
            <img
              src={content.author_avatar_url}
              alt={content.author_name || content.author_username || 'Author'}
              className="w-8 h-8 rounded-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs">
              {(content.author_name || content.author_username || '?')[0].toUpperCase()}
            </div>
          )}
          <div className="flex flex-col">
            {content.author_name && (
              <span className="text-sm font-medium text-white">
                {content.author_name}
              </span>
            )}
            {content.author_username && (
              <span className="text-xs text-slate-400">
                @{content.author_username}
              </span>
            )}
          </div>
        </div>
      )}

      {note && (
        <div className="text-sm text-white">{note}</div>
      )}

      {content.description && (
        <>
          {(hasAuthor || note) && <Separator className="opacity-30" />}
          <div className="text-sm text-slate-300 leading-relaxed line-clamp-3">
            {content.description}
          </div>
        </>
      )}
    </div>
  )
}

export default DetailNotes