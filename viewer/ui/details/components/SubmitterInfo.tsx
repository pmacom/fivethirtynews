import React from 'react'

interface SubmitterInfoProps {
  submittedBy: string
  submittedAt?: string
  authorUsername?: string // To filter out old data where submitted_by = author
  avatarUrl?: string // Optional Discord avatar URL
}

/**
 * Get avatar URL with Discord CDN fallback
 */
function getAvatarDisplay(name: string, avatarUrl?: string) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="w-7 h-7 rounded-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none'
        }}
      />
    )
  }
  // Fallback: first letter initial
  return (
    <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text-xs text-white">
      {name[0]?.toUpperCase() || '?'}
    </div>
  )
}

export const SubmitterInfo = ({ submittedBy, submittedAt, authorUsername, avatarUrl }: SubmitterInfoProps) => {
  // Don't show if no submitter info or if it's "extension" (generic)
  if (!submittedBy || submittedBy === 'extension') return null

  // Don't show if submitted_by matches the author (old data bug)
  if (authorUsername && submittedBy === authorUsername) return null

  return (
    <div className="flex items-center gap-2 shrink-0">
      {getAvatarDisplay(submittedBy, avatarUrl)}
      <div className="flex flex-col items-end text-right">
        <span className="text-[10px] text-slate-400 uppercase tracking-wide">
          Added by
        </span>
        <span className="text-sm text-slate-300 font-medium">
          {submittedBy}
        </span>
      </div>
    </div>
  )
}

export default SubmitterInfo
