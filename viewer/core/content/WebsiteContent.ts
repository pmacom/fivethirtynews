import { BaseContent } from './BaseContent'
import { ContentType, LiveViewContent } from './types'

/**
 * Website/URL content handler
 * Handles generic website links and articles
 */
export class WebsiteContent extends BaseContent {
  constructor(data: LiveViewContent) {
    super(data)
  }

  getType(): ContentType {
    return ContentType.WEBSITE
  }

  getDisplayInfo() {
    const domain = this.extractDomain(this.data.content_url)
    const favicon = this.getFaviconUrl(domain)

    return {
      domain,
      favicon,
      platformIcon: '🌐',
      platformName: 'Website',
      title: this.data.description || domain,
    }
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname.replace('www.', '')
    } catch {
      return 'unknown'
    }
  }

  /**
   * Get favicon URL for the domain
   */
  private getFaviconUrl(domain: string): string {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
  }

  /**
   * Get preview/embed URL if available
   */
  getPreviewUrl(): string {
    return this.data.content_url
  }

  async fetchAdditionalData(): Promise<boolean> {
    // Could fetch Open Graph metadata, page title, etc.
    return false
  }
}
