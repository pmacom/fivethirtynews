import { BaseContent } from './BaseContent'
import { ContentType, LiveViewContent } from './types'

/**
 * Discord message/link content handler
 * Handles Discord message links and embeds
 */
export class DiscordContent extends BaseContent {
  constructor(data: LiveViewContent) {
    super(data)
  }

  getType(): ContentType {
    return ContentType.DISCORD
  }

  getDisplayInfo() {
    const messageInfo = this.parseDiscordUrl(this.data.content_url)

    return {
      ...messageInfo,
      platformIcon: '💬',
      platformName: 'Discord',
    }
  }

  /**
   * Parse Discord URL to extract server and channel info
   * Format: https://discord.com/channels/{server_id}/{channel_id}/{message_id}
   */
  private parseDiscordUrl(url: string): {
    serverId?: string
    channelId?: string
    messageId?: string
  } {
    const match = url.match(/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/)

    if (match) {
      return {
        serverId: match[1],
        channelId: match[2],
        messageId: match[3],
      }
    }

    return {}
  }

  /**
   * Get Discord message embed URL
   */
  getEmbedUrl(): string | null {
    const { serverId, channelId, messageId } = this.parseDiscordUrl(
      this.data.content_url
    )

    if (serverId && channelId && messageId) {
      return `https://discord.com/channels/${serverId}/${channelId}/${messageId}`
    }

    return null
  }

  async fetchAdditionalData(): Promise<boolean> {
    // Could fetch message content via Discord API if available
    return false
  }
}
