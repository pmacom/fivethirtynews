import React from 'react'
import { PlaneView } from '../components/PlaneView'
import { useContentStore } from '../../core/store/contentStore'
import { LiveViewContentBlockItems } from '../../core/content/types'
import ContentWrapper from '../components/ContentWrapper'

interface TemplateImageProps {
  item: LiveViewContentBlockItems
  itemIndex: number
  categoryId: string
}

export const TemplateImage = ({ item, itemIndex, categoryId }: TemplateImageProps) => {
  const activeItemId = useContentStore(state => state.activeItemId)
  const isActive = item.content?.content_id === activeItemId

  // Use CORS-friendly placeholder for now
  const imageUrl = 'https://placehold.co/800x600/3b82f6/white/png?text=Image'

  return (
    <ContentWrapper
      item={item}
      categoryId={categoryId}
      itemIndex={itemIndex}
      active={isActive}
    >
      <PlaneView url={imageUrl} active={isActive} />
    </ContentWrapper>
  )
}

export default TemplateImage
