import React from 'react'
import { useContentStore } from '../../core/store/contentStore'
import { LiveViewContentBlockItems } from '../../core/content/types'
import ContentWrapper from '../components/ContentWrapper'
import { ErrorXView } from '../components/ErrorXView'
import logger from '../../utils/logger'

interface TemplateDefaultProps {
  item: LiveViewContentBlockItems
  active: boolean
  itemIndex: number
  categoryId: string
}

export const TemplateDefault = ({ item, itemIndex, categoryId }: TemplateDefaultProps) => {
  const activeItemId = useContentStore(state => state.activeItemId)
  const isActive = item.content?.id === activeItemId

  // Log when content hits the default template (indicates content_type issue)
  logger.warn('[Default] Content using fallback template:', {
    contentId: item.content?.id,
    contentType: item.content?.content_type,
    platformContentId: (item.content as any)?.platform_content_id,
    hasThumbnail: !!item.content?.thumbnail_url,
    contentUrl: item.content?.content_url?.substring(0, 60),
  })

  return (
    <ContentWrapper
      item={item}
      categoryId={categoryId}
      itemIndex={itemIndex}
      active={isActive}
    >
      <ErrorXView
        active={isActive}
        itemId={item.content?.id}
        message={`Unknown type: ${item.content?.content_type || 'null'}`}
      />
    </ContentWrapper>
  )
}

export default TemplateDefault
