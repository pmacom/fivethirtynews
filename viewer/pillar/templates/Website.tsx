import React from 'react'
import { SafePlaneView } from '../components/SafePlaneView'
import { useContentStore } from '../../core/store/contentStore'
import { LiveViewContentBlockItems } from '../../core/content/types'
import ContentWrapper from '../components/ContentWrapper'

interface TemplateWebsiteProps {
  item: LiveViewContentBlockItems
  itemIndex: number
  categoryId: string
}

export const TemplateWebsite = ({ item, itemIndex, categoryId }: TemplateWebsiteProps) => {
  const activeItemId = useContentStore(state => state.activeItemId)
  const isActive = item.content?.id === activeItemId

  // Get website thumbnail from content data
  const thumbnailUrl = item.content?.thumbnail_url || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg=='

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

export default TemplateWebsite
