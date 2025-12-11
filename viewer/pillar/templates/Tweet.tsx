import React, { useMemo } from 'react'
import { SafePlaneView } from '../components/SafePlaneView'
import { TextPlaneView } from '../components/TextPlaneView'
import { useContentStore, useTweetStore } from '../../core/store/contentStore'
import { LiveViewContentBlockItems } from '../../core/content/types'
import ContentWrapper from '../components/ContentWrapper'
import ErrorBoundary from '../../ErrorBoundary'
import {
  calculateTweetFontSize,
  formatRelativeTime
} from './utils/textSizing'
import { extractVideoUrls } from '../../core/content/utils'

interface TemplateTweetProps {
  item: LiveViewContentBlockItems
  itemIndex: number
  categoryId: string
}

export const TemplateTweet = ({ item, itemIndex, categoryId }: TemplateTweetProps) => {
  const activeItemId = useContentStore(state => state.activeItemId)
  const isActive = item.content?.id === activeItemId
  const getTweet = useTweetStore(state => state.getTweet)

  // Get thumbnail and text from content data
  const contentThumbnail = item.content?.thumbnail_url
  const tweetText = item.content?.description || ''

  // Get tweet data synchronously from pre-loaded store
  // Use platform_content_id (tweet ID) - content_id is legacy/empty for newer content
  const tweet = useMemo(() => {
    const tweetId = (item.content as any)?.platform_content_id || item.content?.content_id
    if (tweetId) {
      return getTweet(tweetId)
    }
    return null
  }, [item.content, getTweet])

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
  // Use author_name/author_username fields from content table
  const displayName = item.content?.author_name || 'Unknown'
  const handle = item.content?.author_username
    ? `@${item.content.author_username}`
    : '@unknown'
  const timestamp = formatRelativeTime(item.content?.content_created_at)
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