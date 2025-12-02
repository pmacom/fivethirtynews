import React from 'react'

interface SubmitterInfoProps {
  submittedBy: string
  submittedAt?: string
  authorUsername?: string // To filter out old data where submitted_by = author
}

export const SubmitterInfo = ({ submittedBy, submittedAt, authorUsername }: SubmitterInfoProps) => {
  // Don't show if no submitter info or if it's "extension" (generic)
  if (!submittedBy || submittedBy === 'extension') return null

  // Don't show if submitted_by matches the author (old data bug)
  if (authorUsername && submittedBy === authorUsername) return null

  return (
    <div className="flex flex-col items-end text-right shrink-0">
      <span className="text-xs text-slate-400">
        Added by
      </span>
      <span className="text-sm text-slate-300 font-medium">
        {submittedBy}
      </span>
    </div>
  )
}

export default SubmitterInfo
