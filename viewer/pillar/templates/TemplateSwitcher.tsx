import React from 'react'
import TemplateTweet from '../templates/Tweet'
import TemplateDefault from '../templates/Default'

interface TemplateSwitcherProps {
  activeItemId: string,
  contentType: string,
  data: any,
  categoryId: string,
  itemIndex: number,
}

export function TemplateSwitcher({
    activeItemId,
    contentType,
    data,
    categoryId,
    itemIndex,
}: TemplateSwitcherProps) {

  const props = {
    item: data,
    itemIndex,
    categoryId,
    active: data.id === activeItemId
  }

    switch (contentType) {
      case 'twitter':
        return <TemplateTweet {...props} />
      default:
        return <TemplateDefault {...props} />
    }
}

export default TemplateSwitcher