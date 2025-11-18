import { BaseContent } from './BaseContent'
import { ContentType, LiveViewContent } from './types'

/**
 * Warpcast (Farcaster protocol) content handler
 * Handles Warpcast posts and casts
 */
export class WarpcastContent extends BaseContent {
  constructor(data: LiveViewContent) {
    super(data)
  }

  getType(): ContentType {
    return ContentType.WARPCAST
  }

  getDisplayInfo() {
    const castInfo = this.parseWarpcastUrl(this.data.content_url)

    return {
      ...castInfo,
      platformIcon: '🟪',
      platformName: 'Warpcast',
    }
  }

  /**
   * Parse Warpcast URL to extract username and cast hash
   * Format: https://warpcast.com/{username}/{cast_hash}
   */
  private parseWarpcastUrl(url: string): {
    username?: string
    castHash?: string
  } {
    const match = url.match(/warpcast\.com\/([^/]+)\/([a-zA-Z0-9]+)/)

    if (match) {
      return {
        username: match[1],
        castHash: match[2],
      }
    }

    return {}
  }

  /**
   * Get Warpcast embed URL
   */
  getEmbedUrl(): string | null {
    const { username, castHash } = this.parseWarpcastUrl(this.data.content_url)

    if (username && castHash) {
      return `https://warpcast.com/${username}/${castHash}`
    }

    return null
  }

  async fetchAdditionalData(): Promise<boolean> {
    // Could fetch cast data via Farcaster API
    return false
  }
}
