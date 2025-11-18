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

  // Use a placeholder for default content type
  const placeholderUrl = 'https://placehold.co/800x600/64748b/white/png?text=Content'

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
