/**
 * Calculate optimal font size for tweet text based on character length
 * Ensures all text fits while maintaining readability
 *
 * @param textLength - Number of characters in the tweet text
 * @returns Font size in three.js units (optimized for 3D space)
 */
export function calculateTweetFontSize(textLength: number): number {
  // Short tweets: large and impactful (0.028 units)
  if (textLength < 50) return 0.028

  // Medium tweets: comfortable reading size (0.024 units)
  if (textLength < 100) return 0.024

  // Long tweets: compact but readable (0.020 units)
  if (textLength < 150) return 0.020

  // Very long tweets: small but clear (0.018 units)
  if (textLength < 200) return 0.018

  // Maximum length tweets: minimum readable size (0.016 units)
  return 0.016
}

/**
 * Extract display name from tweet author field
 * Handles various formats: @username, username, "Name (@username)", etc.
 *
 * @param author - Author string from content metadata
 * @returns Clean display name
 */
export function extractDisplayName(author: string | undefined): string {
  if (!author) return 'Unknown'

  // Remove @ symbol if present
  const cleaned = author.replace('@', '')

  // Extract name before parentheses if format is "Name (@username)"
  const match = cleaned.match(/^([^(]+)/)
  if (match) return match[1].trim()

  return cleaned.trim()
}

/**
 * Extract handle from tweet author field
 * Returns the @username portion
 *
 * @param author - Author string from content metadata
 * @returns Handle with @ symbol
 */
export function extractHandle(author: string | undefined): string {
  if (!author) return '@unknown'

  // If already has @, return as is
  if (author.startsWith('@')) return author

  // Check for format "Name (@username)"
  const match = author.match(/\(@([^)]+)\)/)
  if (match) return `@${match[1]}`

  // Default: add @ to whatever we have
  return `@${author}`
}

/**
 * Format timestamp to relative time (e.g., "2h", "1d", "3w")
 *
 * @param timestamp - ISO timestamp string
 * @returns Formatted relative time string
 */
export function formatRelativeTime(timestamp: string | undefined): string {
  if (!timestamp) return ''

  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    const diffWeeks = Math.floor(diffDays / 7)

    if (diffMins < 1) return 'now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return `${diffWeeks}w`
  } catch {
    return ''
  }
}
