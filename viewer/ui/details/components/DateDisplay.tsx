import React from 'react'

interface DateDisplayProps {
  dateString: string | null | undefined
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const getOrdinalSuffix = (day: number): string => {
  if (day > 3 && day < 21) return 'th'
  switch (day % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

const formatRelativeTime = (date: Date): string => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`
  if (diffMonths > 0) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return 'today'
}

const formatDate = (dateString: string): { formatted: string; relative: string } | null => {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return null

    const month = MONTHS[date.getMonth()]
    const day = date.getDate()
    const year = date.getFullYear()
    const ordinal = getOrdinalSuffix(day)

    return {
      formatted: `${month} ${day}${ordinal}, ${year}`,
      relative: formatRelativeTime(date)
    }
  } catch {
    return null
  }
}

export const DateDisplay = ({ dateString }: DateDisplayProps) => {
  if (!dateString) return null

  const dateInfo = formatDate(dateString)
  if (!dateInfo) return null

  return (
    <div className="flex flex-col items-end text-right shrink-0">
      <span className="text-sm text-white opacity-90">
        {dateInfo.formatted}
      </span>
      <span className="text-xs text-slate-400">
        {dateInfo.relative}
      </span>
    </div>
  )
}

export default DateDisplay
