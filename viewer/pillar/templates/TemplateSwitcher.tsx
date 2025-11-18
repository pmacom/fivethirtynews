import React from 'react'
import TemplateTweet from '../templates/Tweet'
import TemplateTweetUIKit from '../templates/TweetUIKit'
import TemplateVideo from '../templates/Video'
import TemplateImage from '../templates/Image'
import TemplateWebsite from '../templates/Website'
import TemplateWarpcast from '../templates/Warpcast'
import TemplateDiscord from '../templates/Discord'
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
    active: data.content?.content_id === activeItemId
  }

    switch (contentType) {
      case 'twitter':
        return <TemplateTweetUIKit {...props} />
      case 'video':
        return <TemplateVideo {...props} />
      case 'image':
        return <TemplateImage {...props} />
      case 'website':
        return <TemplateWebsite {...props} />
      case 'warpcast':
        return <TemplateWarpcast {...props} />
      case 'discord':
        return <TemplateDiscord {...props} />
      default:
        return <TemplateDefault {...props} />
    }
}

export default TemplateSwitcher