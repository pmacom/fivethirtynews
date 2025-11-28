import React from 'react'
import { SafePlaneView } from '../components/SafePlaneView'
import { useContentStore } from '../../core/store/contentStore'
import { LiveViewContentBlockItems } from '../../core/content/types'
import ContentWrapper from '../components/ContentWrapper'
import { getYouTubeVideoData } from '../../core/content/youtubeUtils'

interface TemplateVideoProps {
  item: LiveViewContentBlockItems
  itemIndex: number
  categoryId: string
}

export const TemplateVideo = ({ item, itemIndex, categoryId }: TemplateVideoProps) => {
  const activeItemId = useContentStore(state => state.activeItemId)
  const isActive = item.content?.content_id === activeItemId

  const videoUrl = item.content?.content_url || ''

  // Check if this is a YouTube video
  const youtubeData = getYouTubeVideoData(videoUrl)

  // Use YouTube thumbnail if available, otherwise use content thumbnail
  const thumbnailUrl = youtubeData.isYouTube && youtubeData.thumbnailUrl
    ? youtubeData.thumbnailUrl
    : item.content?.thumbnail_url || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='

  // For YouTube videos, don't pass videoUrl (prevents CORS errors), pass YouTube watch URL instead
  const actualVideoUrl = youtubeData.isYouTube ? undefined : videoUrl
  const clickUrl = youtubeData.isYouTube ? youtubeData.watchUrl : undefined

  return (
    <ContentWrapper
      item={item}
      categoryId={categoryId}
      itemIndex={itemIndex}
      active={isActive}
    >
      <SafePlaneView
        url={thumbnailUrl}
        active={isActive}
        videoUrl={actualVideoUrl}
        itemId={item.id}
        clickUrl={clickUrl}
        isYouTube={youtubeData.isYouTube}
      />
    </ContentWrapper>
  )
}

export default TemplateVideo
