import { BaseContent } from './BaseContent'
import { ContentType, LiveViewContent } from './types'

/**
 * Video content handler
 * Primarily handles YouTube videos, but extensible to other platforms
 */
export class VideoContent extends BaseContent {
  constructor(data: LiveViewContent) {
    super(data)
  }

  getType(): ContentType {
    return ContentType.VIDEO
  }

  getDisplayInfo() {
    const platform = this.detectPlatform(this.data.content_url)
    const videoId = this.extractVideoId(this.data.content_url, platform)

    return {
      videoId,
      platform,
      platformIcon: this.getPlatformIcon(platform),
      platformName: platform,
    }
  }

  /**
   * Detect video platform from URL
   */
  private detectPlatform(url: string): string {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'YouTube'
    }
    if (url.includes('vimeo.com')) {
      return 'Vimeo'
    }
    if (url.includes('twitch.tv')) {
      return 'Twitch'
    }
    return 'Unknown'
  }

  /**
   * Extract video ID based on platform
   */
  private extractVideoId(url: string, platform: string): string | null {
    if (platform === 'YouTube') {
      // Handle various YouTube URL formats
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
      ]

      for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match) return match[1]
      }
    }

    if (platform === 'Vimeo') {
      const match = url.match(/vimeo\.com\/(\d+)/)
      if (match) return match[1]
    }

    return null
  }

  /**
   * Get platform icon
   */
  private getPlatformIcon(platform: string): string {
    const icons: Record<string, string> = {
      YouTube: '▶',
      Vimeo: '▷',
      Twitch: '◆',
    }
    return icons[platform] || '▶'
  }

  /**
   * Get embed URL for the video
   */
  getEmbedUrl(): string | null {
    const { platform, videoId } = this.getDisplayInfo()

    if (!videoId) return null

    if (platform === 'YouTube') {
      return `https://www.youtube.com/embed/${videoId}`
    }

    if (platform === 'Vimeo') {
      return `https://player.vimeo.com/video/${videoId}`
    }

    return null
  }

  async fetchAdditionalData(): Promise<boolean> {
    // Could fetch video metadata, duration, etc.
    return false
  }
}
