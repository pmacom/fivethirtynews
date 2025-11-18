import React, { useEffect, useMemo, useState } from 'react'
import { PlaneView } from '../components/PlaneView'
import { useContentStore } from '../../core/store/contentStore'
import { useThree } from '@react-three/fiber'
import { Root, Container } from '@react-three/uikit'

import { LiveViewContentBlock, LiveViewContentBlockItems } from '../../core/content/types'
import Default3dContent from './Default'
import { useTweetStore } from '@/viewer/core/store/contentStore'
import { extractVideoUrls } from '@/viewer/core/content/utils'
import { TweetCard } from '@/components/tweet'
import {
  getMediaInfo,
  getBestVideoVariant,
  getPhotoUrls,
  getHighestQualityPhoto
} from '@/components/tweet/TweetParser'
import { ParsedTweetData } from '@/components/tweet/tweet-types'

interface TemplateTweetProps {
  item: LiveViewContentBlockItems
  itemIndex: number
  categoryId: string
}

export const TemplateTweet = ({ item, itemIndex, categoryId }: TemplateTweetProps) => {
  const { size: { width, height } } = useThree()
  const [tweetData, setTweetData] = useState<ParsedTweetData | null>(null)
  const [videos, setVideos] = useState<string[]>([])
  const [photos, setPhotos] = useState<string[]>([])
  const activeItemId = useContentStore(state => state.activeItemId)
  const isActive = item.content?.content_id === activeItemId

  // Calculate screen aspect for sizing the tweet card
  const [screenAspect, setScreenAspect] = useState<[number, number]>([1, 1])

  useEffect(() => {
    const maxWindowDimension = Math.max(width, height)
    const windowWidth = width / maxWindowDimension
    const windowHeight = height / maxWindowDimension
    setScreenAspect([windowWidth, windowHeight])
  }, [width, height])

  // Fetch full tweet data when active
  useEffect(() => {
    const fetchTweet = async () => {
      if (!isActive) return
      console.log('Fetching tweet:', item.content.content_id)
      try {
        const tweet = await useTweetStore.getState().getTweet(item.content.content_id)
        console.log('getTweet returned:', tweet)

        // Store full tweet data
        if (tweet?.data) {
          console.log('tweet.data:', tweet.data)
          console.log('tweet.data.user:', tweet.data.user)
          setTweetData(tweet.data)
        } else {
          console.error('No tweet.data found:', tweet)
        }

        // Extract media URLs
        const videoUrls = extractVideoUrls(tweet)
        const photoUrls = getPhotoUrls(tweet)

        setVideos(videoUrls)
        setPhotos(photoUrls)
      } catch (error) {
        console.error('Failed to fetch tweet:', error)
      }
    }
    fetchTweet()
  }, [isActive, item])

  // Determine media type and best display URL
  const mediaInfo = useMemo(() => {
    if (!tweetData) return null
    const info = getMediaInfo({ data: tweetData })
    return info
  }, [tweetData])

  const displayUrl = useMemo(() => {
    // Prefer stored thumbnail, fallback to extracted photo
    if (item.content?.thumbnail_url) return item.content.thumbnail_url
    if (photos.length > 0) return photos[0]
    return null
  }, [item.content?.thumbnail_url, photos])

  const videoUrl = useMemo(() => {
    if (videos.length > 0) return videos[videos.length - 1]
    return undefined
  }, [videos])

  // Smart display logic:
  // 1. If text-only and has tweet data → TweetCard (prioritize this)
  // 2. If has media (photos/videos) → PlaneView
  // 3. Fallback → Default3dContent

  // Check for text-only tweets FIRST (before checking displayUrl)
  if (mediaInfo?.isTextOnly && tweetData) {
    // Text-only tweet - use rich TweetCard inside same structure as Default
    console.log('Rendering text-only tweet as TweetCard:', tweetData.text)

    return (
      <group
        onClick={() => {
          useContentStore.setState({
            activeCategoryId: categoryId,
            activeItemId: item.content.content_id,
            activeItemIndex: itemIndex,
          })
        }}
      >
        <Root width={100} height={100}>
          <Container
            width={100}
            height={100}
            justifyContent="flex-start"
            alignItems="flex-start"
            padding={0}
            backgroundColor="transparent"
          >
            <mesh position={[0, 0, 0.01]}>
              <planeGeometry args={[screenAspect[0], screenAspect[1]]} />
              <meshBasicMaterial transparent opacity={0} />

              {/* Tweet content inside the viewport-sized container */}
              <Container
                width={screenAspect[0] * 100}
                height={screenAspect[1] * 100}
                flexDirection="column"
                padding={8}
                gap={8}
                overflow="scroll"
              >
                <TweetCard tweetData={tweetData} width={screenAspect[0] * 90} height={screenAspect[1] * 90} />
              </Container>
            </mesh>
          </Container>
        </Root>
      </group>
    )
  }

  // Media tweet with photos or videos - use PlaneView
  if ((mediaInfo?.hasPhotos || mediaInfo?.hasVideo) && displayUrl) {
    console.log('Rendering media tweet with PlaneView')
    return (
      <PlaneView
        url={displayUrl}
        active={isActive}
        videoUrl={videoUrl}
        key={item.id}
        onClick={(id) => {
          useContentStore.setState({
            activeCategoryId: categoryId,
            activeItemId: item.content.content_id,
            activeItemIndex: itemIndex,
          })
        }}
      />
    )
  }

  // Fallback for loading state or no data
  return (
    <Default3dContent
      item={item}
      itemIndex={itemIndex}
      categoryId={categoryId}
      active={isActive}
    />
  )
}

export default TemplateTweet