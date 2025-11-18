import React from 'react'
import { PlaneView } from '../components/PlaneView'
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

  // Solid color data URI - blue for tweet
  const thumbnailUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg=='

  return (
    <ContentWrapper
      item={item}
      categoryId={categoryId}
      itemIndex={itemIndex}
      active={isActive}
    >
      <PlaneView url={thumbnailUrl} active={isActive} />
    </ContentWrapper>
  )
}

export default TemplateTweet