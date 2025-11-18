import React from 'react'
import { PlaneView } from '../components/PlaneView'
import { useContentStore } from '../../core/store/contentStore'
import { LiveViewContentBlockItems } from '../../core/content/types'
import ContentWrapper from '../components/ContentWrapper'

interface TemplateDiscordProps {
  item: LiveViewContentBlockItems
  itemIndex: number
  categoryId: string
}

export const TemplateDiscord = ({ item, itemIndex, categoryId }: TemplateDiscordProps) => {
  const activeItemId = useContentStore(state => state.activeItemId)
  const isActive = item.content?.content_id === activeItemId

  // Solid color data URI - indigo for discord
  const thumbnailUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk4GD4DwABhgHfP6uktwAAAABJRU5ErkJggg=='

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

export default TemplateDiscord
