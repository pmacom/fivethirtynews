import { BaseContent } from './BaseContent'
import { ContentType, LiveViewContent } from './types'

/**
 * Image content handler
 * Handles image URLs and displays
 */
export class ImageContent extends BaseContent {
  constructor(data: LiveViewContent) {
    super(data)
  }

  getType(): ContentType {
    return ContentType.IMAGE
  }

  getDisplayInfo() {
    const imageInfo = this.analyzeImageUrl(this.data.content_url)

    return {
      ...imageInfo,
      platformIcon: '🖼️',
      platformName: 'Image',
      imageUrl: this.data.content_url,
    }
  }

  /**
   * Analyze image URL to extract format and source
   */
  private analyzeImageUrl(url: string): {
    format?: string
    source?: string
  } {
    const formatMatch = url.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)$/i)
    const format = formatMatch ? formatMatch[1].toUpperCase() : 'Unknown'

    let source = 'Direct Link'
    if (url.includes('imgur.com')) source = 'Imgur'
    else if (url.includes('cloudinary.com')) source = 'Cloudinary'
    else if (url.includes('cdn.')) source = 'CDN'

    return { format, source }
  }

  /**
   * Get the image URL (same as content URL for images)
   */
  getImageUrl(): string {
    return this.data.content_url
  }

  /**
   * Get high-quality version of thumbnail if available
   */
  getHighResUrl(): string {
    // If thumbnail exists and is different from main URL, prefer main URL
    return this.data.content_url
  }

  async fetchAdditionalData(): Promise<boolean> {
    // Could fetch image dimensions, EXIF data, etc.
    return false
  }
}
