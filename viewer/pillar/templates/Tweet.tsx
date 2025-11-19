import React, { useMemo } from 'react'
import { SafePlaneView } from '../components/SafePlaneView'
import { TextPlaneView } from '../components/TextPlaneView'
import { useContentStore, useTweetStore } from '../../core/store/contentStore'
import { LiveViewContentBlockItems } from '../../core/content/types'
import ContentWrapper from '../components/ContentWrapper'
import ErrorBoundary from '../../ErrorBoundary'
import {
  calculateTweetFontSize,
  extractDisplayName,
  extractHandle,
  formatRelativeTime
} from './utils/textSizing'
import { extractVideoUrls } from '../../core/content/utils'
import logger from '../../utils/logger'

interface TemplateTweetProps {
  item: LiveViewContentBlockItems
  itemIndex: number
  categoryId: string
}

export const TemplateTweet = ({ item, itemIndex, categoryId }: TemplateTweetProps) => {
  const activeItemId = useContentStore(state => state.activeItemId)
  const isActive = item.content?.content_id === activeItemId
  const getTweet = useTweetStore(state => state.getTweet)

  // Get thumbnail and text from content data
  const contentThumbnail = item.content?.thumbnail_url
  const tweetText = item.content?.description || ''

  // Get tweet data synchronously from pre-loaded store
  const tweet = useMemo(() => {
    const contentId = item.content?.content_id
    if (contentId) {
      return getTweet(contentId)
    }
    return null
  }, [item.content?.content_id, getTweet])

  // Extract media URLs from tweet data
  const tweetMedia = useMemo(() => {
    if (!tweet?.data) return null

    // Extract video URLs from tweet data
    const videoUrls = extractVideoUrls(tweet)
    const videoUrl = videoUrls.length > 0 ? videoUrls[0] : null

    // Extract image URLs from tweet data
    const imageUrl = tweet.data.photos?.[0]?.url
      || tweet.data.mediaDetails?.[0]?.media_url_https
      || null

    // Get video poster/thumbnail
    const poster = tweet.data.video?.poster
      || tweet.data.mediaDetails?.[0]?.media_url_https
      || null

    return { videoUrl, imageUrl, poster }
  }, [tweet])

  // Extract tweet metadata for display
  const displayName = extractDisplayName(item.content?.author)
  const handle = extractHandle(item.content?.author)
  const timestamp = formatRelativeTime(item.content?.created_at)
  const fontSize = calculateTweetFontSize(tweetText.length)

  // Determine final media URLs (prefer tweet data, fallback to content thumbnail)
  const hasVideo = tweetMedia?.videoUrl != null
  const hasImage = tweetMedia?.imageUrl != null || contentThumbnail != null
  const hasMedia = hasVideo || hasImage

  // Select the best media URL based on what's available
  const finalVideoUrl = tweetMedia?.videoUrl || null
  const finalPosterUrl = tweetMedia?.poster || contentThumbnail || null
  const finalImageUrl = tweetMedia?.imageUrl || contentThumbnail || null

  // Proxy Twitter images through our API to avoid 403 errors
  const thumbnailUrl = finalPosterUrl || finalImageUrl
    ? `/api/proxy-image?url=${encodeURIComponent(finalPosterUrl || finalImageUrl || '')}`
    : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg=='

  // Detect media type
  const mediaType = hasVideo ? 'video' : hasImage ? 'image' : 'text'

  // Debug logging (only when active to reduce noise)
  if (isActive) {
    logger.debug('[Tweet]', {
      contentId: item.content?.content_id,
      hasMedia,
      mediaType,
      displayMode: hasMedia ? 'MEDIA_ONLY' : 'TEXT_CARD',
      thumbnailUrl: contentThumbnail || '(none)',
      textLength: tweetText.length,
      fontSize: hasMedia ? 'N/A' : fontSize,
    })

    // Warn if this might be a data quality issue
    if (!hasMedia && tweetText.toLowerCase().includes('pic.twitter.com')) {
      logger.warn('[Tweet] Text-only tweet mentions pic.twitter.com - possible missing media', {
        contentId: item.content?.content_id,
        text: tweetText.substring(0, 100)
      })
    }
  }

  return (
    <ErrorBoundary
      silent={true}
      fallback={
        <ContentWrapper
          item={item}
          categoryId={categoryId}
          itemIndex={itemIndex}
          active={isActive}
        >
          <TextPlaneView
            text="Tweet failed to load"
            displayName="Error"
            handle="@error"
            timestamp="N/A"
            fontSize={24}
            active={isActive}
          />
        </ContentWrapper>
      }
    >
      <ContentWrapper
        item={item}
        categoryId={categoryId}
        itemIndex={itemIndex}
        active={isActive}
      >
        {hasMedia ? (
          // Tweet with media: Show media (video or image)
          <SafePlaneView
            url={thumbnailUrl}
            active={isActive}
            videoUrl={finalVideoUrl || undefined}
            itemId={item.id}
          />
        ) : (
          // Text-only tweet: Show TextPlaneView (matches PlaneView dimensions)
          <TextPlaneView
            text={tweetText}
            displayName={displayName}
            handle={handle}
            timestamp={timestamp}
            fontSize={fontSize}
            active={isActive}
          />
        )}
      </ContentWrapper>
    </ErrorBoundary>
  )
}

export default TemplateTweet