import { BaseContent } from './BaseContent'
import { ContentType, LiveViewContent } from './types'

/**
 * Twitter/X content handler
 * Handles tweets, including video tweets
 */
export class TweetContent extends BaseContent {
  constructor(data: LiveViewContent) {
    super(data)
  }

  getType(): ContentType {
    return ContentType.TWITTER
  }

  getDisplayInfo() {
    // Extract tweet ID from URL
    const tweetId = this.extractTweetId(this.data.content_url)

    return {
      tweetId,
      platformIcon: '𝕏', // Twitter/X icon
      platformName: 'Twitter',
    }
  }

  /**
   * Extract tweet ID from various Twitter URL formats
   * Supports: twitter.com, x.com, with or without /status/
   */
  private extractTweetId(url: string): string | null {
    const patterns = [
      /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
      /(?:twitter\.com|x\.com)\/.*\/(\d+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }

    return null
  }

  /**
   * Get the embed URL for this tweet
   */
  getEmbedUrl(): string | null {
    const tweetId = this.extractTweetId(this.data.content_url)
    if (!tweetId) return null

    return `https://platform.twitter.com/embed/Tweet.html?id=${tweetId}`
  }

  /**
   * Fetch additional tweet data from database if needed
   */
  async fetchAdditionalData(): Promise<boolean> {
    // This would be implemented to fetch from TweetStore
    // For now, just return false (no additional data fetched)
    return false
  }
}
