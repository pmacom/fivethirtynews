import React, { useRef, useEffect } from 'react'
import { Container, Text, DefaultProperties } from '@react-three/uikit'
import { SafePlaneView } from '../components/SafePlaneView'
import { useContentStore } from '../../core/store/contentStore'
import { useSceneStore } from '../../scene/store'
import { LiveViewContentBlockItems } from '../../core/content/types'
import ContentWrapper from '../components/ContentWrapper'
import * as THREE from 'three'

interface TemplateTweetUIKitProps {
  item: LiveViewContentBlockItems
  itemIndex: number
  categoryId: string
}

/**
 * TweetUIKit - Prototype template using @react-three/uikit for flexbox-based layout
 *
 * This template demonstrates:
 * - UIKit Container as flexbox wrapper for the slide
 * - PlaneView for image/video rendering (maintains existing aspect ratio logic)
 * - UIKit Text overlays for metadata
 * - fitToBox compatibility with Container refs
 */
export const TemplateTweetUIKit = ({ item, itemIndex, categoryId }: TemplateTweetUIKitProps) => {
  const activeItemId = useContentStore(state => state.activeItemId)
  const isActive = item.content?.content_id === activeItemId

  const containerRef = useRef<THREE.Group>(null)

  // Get thumbnail from content data
  const contentThumbnail = item.content?.thumbnail_url

  // Detect media type based on thumbnail URL pattern
  const mediaType = contentThumbnail
    ? contentThumbnail.includes('ext_tw_video_thumb') || contentThumbnail.includes('amplify_video_thumb')
      ? 'video'
      : contentThumbnail.includes('media') || contentThumbnail.includes('pbs.twimg.com')
      ? 'image'
      : 'unknown'
    : 'text'

  // Proxy Twitter images through our API to avoid 403 errors
  const thumbnailUrl = contentThumbnail
    ? `/api/proxy-image?url=${encodeURIComponent(contentThumbnail)}`
    : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg=='

  // Extract tweet metadata for overlay
  const tweetAuthor = item.content?.author_name || 'Unknown'
  const tweetText = item.content?.description?.substring(0, 100) || ''

  // Set activeItemObject and trigger fitToBox for UIKit Container
  useEffect(() => {
    if (isActive && containerRef.current) {
      useContentStore.setState({ activeItemObject: containerRef.current })
      requestAnimationFrame(() => {
        useSceneStore.getState().fitToBox()
      })
    }
  }, [isActive])

  // Debug logging (only when active to reduce noise)
  if (isActive) {
    console.log('[TweetUIKit]', {
      contentId: item.content?.content_id,
      mediaType,
      thumbnailUrl: contentThumbnail,
      author: tweetAuthor
    })
  }

  return (
    <ContentWrapper
      item={item}
      categoryId={categoryId}
      itemIndex={itemIndex}
      active={isActive}
    >
      {/* PlaneView handles image/video rendering (Three.js) */}
      <SafePlaneView url={thumbnailUrl} active={isActive} />

      {/* UIKit overlay for text metadata - positioned absolutely */}
      {isActive && (
        <DefaultProperties>
          <Container
            positionType="absolute"
            positionBottom={0}
            positionLeft={0}
            positionRight={0}
            padding={16}
            backgroundColor="rgba(0, 0, 0, 0.7)"
            flexDirection="column"
            gap={8}
          >
            <Text fontSize={14} color="#ffffff" fontWeight="bold">
              @{tweetAuthor}
            </Text>
            {tweetText && (
              <Text fontSize={12} color="#e0e0e0" lineHeight={1.4}>
                {tweetText}
              </Text>
            )}
          </Container>
        </DefaultProperties>
      )}
    </ContentWrapper>
  )
}

export default TemplateTweetUIKit
