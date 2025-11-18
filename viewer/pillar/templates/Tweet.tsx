import React from 'react'
import { SafePlaneView } from '../components/SafePlaneView'
import { useContentStore } from '../../core/store/contentStore'
import { LiveViewContentBlockItems } from '../../core/content/types'
import ContentWrapper from '../components/ContentWrapper'

interface TemplateTweetProps {
  item: LiveViewContentBlockItems
  itemIndex: number
  categoryId: string
}

export const TemplateTweet = ({ item, itemIndex, categoryId }: TemplateTweetProps) => {
  const activeItemId = useContentStore(state => state.activeItemId)
  const isActive = item.content?.content_id === activeItemId

  // Get thumbnail from content data
  const contentThumbnail = item.content?.thumbnail_url

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
      mediaType,
      thumbnailUrl: contentThumbnail,
      description: item.content?.description?.substring(0, 50) + '...'
    })
  }

  return (
    <ContentWrapper
      item={item}
      categoryId={categoryId}
      itemIndex={itemIndex}
      active={isActive}
    >
      <SafePlaneView url={thumbnailUrl} active={isActive} />
    </ContentWrapper>
  )
}

export default TemplateTweet