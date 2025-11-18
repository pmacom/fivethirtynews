import React from 'react'
import { SafePlaneView } from '../components/SafePlaneView'
import { TextPlaneView } from '../components/TextPlaneView'
import { useContentStore } from '../../core/store/contentStore'
import { LiveViewContentBlockItems } from '../../core/content/types'
import ContentWrapper from '../components/ContentWrapper'
import {
  calculateTweetFontSize,
  extractDisplayName,
  extractHandle,
  formatRelativeTime
} from './utils/textSizing'

interface TemplateTweetProps {
  item: LiveViewContentBlockItems
  itemIndex: number
  categoryId: string
}

export const TemplateTweet = ({ item, itemIndex, categoryId }: TemplateTweetProps) => {
  const activeItemId = useContentStore(state => state.activeItemId)
  const isActive = item.content?.content_id === activeItemId

  // Get thumbnail and text from content data
  const contentThumbnail = item.content?.thumbnail_url
  const tweetText = item.content?.description || ''

  // Extract tweet metadata for display
  const displayName = extractDisplayName(item.content?.author)
  const handle = extractHandle(item.content?.author)
  const timestamp = formatRelativeTime(item.content?.created_at)
  const fontSize = calculateTweetFontSize(tweetText.length)

  // Robust media detection: validate thumbnail_url is a valid, non-empty URL
  const hasMedia = contentThumbnail &&
                   typeof contentThumbnail === 'string' &&
                   contentThumbnail.trim().length > 0 &&
                   (contentThumbnail.startsWith('http://') ||
                    contentThumbnail.startsWith('https://') ||
                    contentThumbnail.startsWith('data:'))

  // Detect media type based on thumbnail URL pattern
  const mediaType = contentThumbnail
    ? contentThumbnail.includes('ext_tw_video_thumb') || contentThumbnail.includes('amplify_video_thumb')
      ? 'video'
      : contentThumbnail.includes('media') || contentThumbnail.includes('pbs.twimg.com')
      ? 'image'
      : 'unknown'
    : 'text'

  // Proxy Twitter images through our API to avoid 403 errors
  const thumbnailUrl = contentThumbnail
    ? `/api/proxy-image?url=${encodeURIComponent(contentThumbnail)}`
    : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg=='

  // Debug logging (only when active to reduce noise)
  if (isActive) {
    console.log('[Tweet]', {
      contentId: item.content?.content_id,
      hasMedia,
      mediaType,
      displayMode: hasMedia ? 'MEDIA_ONLY' : 'TEXT_CARD',
      thumbnailUrl: contentThumbnail || '(none)',
      textLength: tweetText.length,
      fontSize: hasMedia ? 'N/A' : fontSize,
    })

    // Warn if this might be a data quality issue
    if (!hasMedia && tweetText.toLowerCase().includes('pic.twitter.com')) {
      console.warn('[Tweet] Text-only tweet mentions pic.twitter.com - possible missing media', {
        contentId: item.content?.content_id,
        text: tweetText.substring(0, 100)
      })
    }
  }

  return (
    <ContentWrapper
      item={item}
      categoryId={categoryId}
      itemIndex={itemIndex}
      active={isActive}
    >
      {hasMedia ? (
        // Tweet with media: Show only the media thumbnail
        <SafePlaneView url={thumbnailUrl} active={isActive} />
      ) : (
        // Text-only tweet: Show TextPlaneView (matches PlaneView dimensions)
        <TextPlaneView
          text={tweetText}
          displayName={displayName}
          handle={handle}
          timestamp={timestamp}
          fontSize={fontSize}
          active={isActive}
        />
      )}
    </ContentWrapper>
  )
}

export default TemplateTweet