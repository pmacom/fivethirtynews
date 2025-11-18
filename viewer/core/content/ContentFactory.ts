import { BaseContent } from './BaseContent'
import { TweetContent } from './TweetContent'
import { VideoContent } from './VideoContent'
import { WebsiteContent } from './WebsiteContent'
import { DiscordContent } from './DiscordContent'
import { WarpcastContent } from './WarpcastContent'
import { ImageContent } from './ImageContent'
import { ContentType, LiveViewContent } from './types'

/**
 * Factory function to create the appropriate content instance
 * based on the content type
 *
 * @param data - The content data from the database
 * @returns An instance of the appropriate content class
 *
 * @example
 * ```ts
 * const content = createContentInstance(contentData)
 * const displayInfo = content.getDisplayInfo()
 * const embedUrl = content instanceof TweetContent ? content.getEmbedUrl() : null
 * ```
 */
export function createContentInstance(data: LiveViewContent): BaseContent {
  switch (data.content_type) {
    case ContentType.TWITTER:
      return new TweetContent(data)

    case ContentType.VIDEO:
      return new VideoContent(data)

    case ContentType.WEBSITE:
      return new WebsiteContent(data)

    case ContentType.DISCORD:
      return new DiscordContent(data)

    case ContentType.WARPCAST:
      return new WarpcastContent(data)

    case ContentType.IMAGE:
      return new ImageContent(data)

    default:
      // Fallback to WebsiteContent for unknown types
      console.warn(`Unknown content type: ${data.content_type}, defaulting to WebsiteContent`)
      return new WebsiteContent(data)
  }
}
