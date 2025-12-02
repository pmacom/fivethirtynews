import React, { useEffect, useMemo, useState } from 'react'
import { PlaneView } from '../components/PlaneView'
import { ContentStore } from '../../Content/contentStore'

import { LiveViewContentBlock, LiveViewContentBlockItems } from '../../Content/types'
import Default3dContent from './Default'
import { TweetStore } from '@/wtf/Content/contentStore'
import { extractVideoUrls } from '@/wtf/Content/utils/contentUtils'
import { useStoreValue } from 'zustand-x'

interface TemplateTweetProps {
  item: LiveViewContentBlockItems
  itemIndex: number
  categoryId: string
}

export const TemplateTweet = ({ item, itemIndex, categoryId }: TemplateTweetProps) => {
  const thumbnail = useMemo(() => {
    const t = item.content?.thumbnail_url
    return t
  }, [item])

  // const [data, setData] = useState<any>(null);
  const [videos, setVideos] = useState<string[]>([]);
  const activeItemId = useStoreValue(ContentStore, 'activeItemId')
  const isActive = item.content?.content_id === activeItemId

  useEffect(() => {
    const fetchTweet = async () => {
      if (!isActive) return;
      console.log('Fetching tweet:', item.content.content_id);
      try {
        const tweet = await TweetStore.set('getTweet', item.content.content_id);
        const videoUrls = extractVideoUrls(tweet);
        setVideos(videoUrls);
      } catch (error) {
        console.error('Failed to fetch tweet:', error);
      }
    }
    fetchTweet();
  }, [isActive, item]);

  return thumbnail ? (
      <PlaneView
        url={thumbnail}
        active={isActive}
        videoUrl={videos.length ? videos[videos.length - 1] : undefined}
        key={item.id}
        onClick={(id) => {
          ContentStore.set('mergeState', {
            activeCategoryId: categoryId,
            activeItemId: item.content.content_id,
            activeItemIndex: itemIndex,
          })
        }}
      />
    ):(
      <Default3dContent
        item={item}
        itemIndex={itemIndex}
        categoryId={categoryId}
        active={isActive}
      >
        
      </Default3dContent>
    )
}

export default TemplateTweet