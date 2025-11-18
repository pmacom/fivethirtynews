import React from 'react'
import { PlaneView } from '../components/PlaneView'
import { useContentStore } from '../../core/store/contentStore'
import { LiveViewContentBlockItems } from '../../core/content/types'
import ContentWrapper from '../components/ContentWrapper'

interface TemplateDefaultProps {
  item: LiveViewContentBlockItems
  active: boolean
  itemIndex: number
  categoryId: string
}

export const TemplateDefault = ({ item, itemIndex, categoryId }: TemplateDefaultProps) => {
  const activeItemId = useContentStore(state => state.activeItemId)
  const isActive = item.content?.content_id === activeItemId

  // Solid color data URI - gray for default
  const placeholderUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKQAAAABJRU5ErkJggg=='

  return (
    <ContentWrapper
      item={item}
      categoryId={categoryId}
      itemIndex={itemIndex}
      active={isActive}
    >
      <PlaneView url={placeholderUrl} active={isActive} />
    </ContentWrapper>
  )
}

export default TemplateDefault
