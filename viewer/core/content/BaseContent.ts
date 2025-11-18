import { ContentType, LiveViewContent } from './types'

/**
 * Abstract base class for all content types
 * Provides common functionality for rendering and managing different content types
 * (YouTube videos, Twitter posts, Warpcast posts, websites, Discord messages, images)
 */
export abstract class BaseContent {
  protected data: LiveViewContent

  constructor(data: LiveViewContent) {
    this.data = data
  }

  /**
   * Get the content type
   */
  abstract getType(): ContentType

  /**
   * Get the display URL for this content
   */
  getUrl(): string {
    return this.data.content_url
  }

  /**
   * Get the thumbnail URL
   */
  getThumbnail(): string | null {
    return this.data.thumbnail_url
  }

  /**
   * Get the content ID (platform-specific identifier)
   */
  getContentId(): string | null {
    return this.data.content_id
  }

  /**
   * Get content metadata
   */
  getMetadata() {
    return {
      id: this.data.id,
      version: this.data.version,
      category: this.data.category,
      categories: this.data.categories,
      description: this.data.description,
      submittedBy: this.data.submitted_by,
      submittedAt: this.data.submitted_at,
      createdAt: this.data.content_created_at,
    }
  }

  /**
   * Get all raw data
   */
  getData(): LiveViewContent {
    return this.data
  }

  /**
   * Check if content is of a specific type
   */
  isType(type: ContentType): boolean {
    return this.data.content_type === type
  }

  /**
   * Abstract method to get platform-specific display info
   * Each content type implements this differently
   */
  abstract getDisplayInfo(): {
    title?: string
    author?: string
    platformIcon?: string
    [key: string]: any
  }

  /**
   * Abstract method for any content-specific data fetching
   * Returns true if additional data was fetched
   */
  abstract fetchAdditionalData?(): Promise<boolean>
}
