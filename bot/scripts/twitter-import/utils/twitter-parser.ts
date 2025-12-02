import { readFileSync } from 'fs'

export interface TwitterLike {
  tweetId: string
  fullText: string
  expandedUrl: string
}

export interface TwitterExportData {
  likes: TwitterLike[]
  totalCount: number
}

/**
 * Parse the Twitter likes.js export file
 * Expected format: window.YTD.like.part0 = [{ like: { tweetId, fullText, expandedUrl } }]
 */
export function parseTwitterLikesFile(filePath: string): TwitterExportData {
  const fileContent = readFileSync(filePath, 'utf-8')

  // Extract the JSON array from the JavaScript file
  // Remove "window.YTD.like.part0 = " and any trailing semicolons
  const jsonMatch = fileContent.match(/window\.YTD\.like\.part\d+\s*=\s*(\[[\s\S]*\])\s*;?/)

  if (!jsonMatch) {
    throw new Error('Could not parse Twitter likes file. Expected format: window.YTD.like.part0 = [...]')
  }

  const jsonString = jsonMatch[1]
  const rawData = JSON.parse(jsonString)

  // Transform the data structure
  const likes: TwitterLike[] = rawData.map((item: any) => {
    const likeData = item.like
    return {
      tweetId: likeData.tweetId,
      fullText: likeData.fullText,
      expandedUrl: likeData.expandedUrl
    }
  })

  return {
    likes,
    totalCount: likes.length
  }
}

/**
 * Extract tweet ID from a filename
 * Format: {tweetId}-{hash}.{ext} or just {tweetId}.{ext}
 */
export function extractTweetIdFromFilename(filename: string): string | null {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '')

  // Try to extract tweet ID (numeric part before first dash or entire name)
  const match = nameWithoutExt.match(/^(\d+)/)

  return match ? match[1] : null
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const match = filename.match(/\.([^.]+)$/)
  return match ? match[1].toLowerCase() : ''
}

/**
 * Check if extension is an image
 */
export function isImageExtension(ext: string): boolean {
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext.toLowerCase())
}

/**
 * Check if extension is a video
 */
export function isVideoExtension(ext: string): boolean {
  return ['mp4', 'mov', 'webm', 'avi'].includes(ext.toLowerCase())
}

/**
 * Batch array into chunks
 */
export function batchArray<T>(array: T[], batchSize: number): T[][] {
  const batches: T[][] = []
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize))
  }
  return batches
}

/**
 * Format progress percentage
 */
export function formatProgress(current: number, total: number): string {
  const percentage = ((current / total) * 100).toFixed(2)
  return `${current}/${total} (${percentage}%)`
}

/**
 * Delay helper for rate limiting
 */
export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Extract username from Twitter URL
 * Format: https://twitter.com/username/status/tweetId or https://x.com/username/status/tweetId
 */
export function extractUsernameFromUrl(url: string): string | null {
  try {
    const match = url.match(/(?:twitter\.com|x\.com)\/([^/]+)\/status\//)
    return match ? match[1] : null
  } catch {
    return null
  }
}

export default {
  parseTwitterLikesFile,
  extractTweetIdFromFilename,
  getFileExtension,
  isImageExtension,
  isVideoExtension,
  batchArray,
  formatProgress,
  delay,
  extractUsernameFromUrl
}
