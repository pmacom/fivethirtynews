import React, { useMemo } from 'react'
import { SafePlaneView } from '../components/SafePlaneView'
import { TextPlaneView } from '../components/TextPlaneView'
import { QuoteTweetView } from '../components/QuoteTweetView'
import { TombstoneView } from '../components/TombstoneView'
import { useContentStore, useTweetStore } from '../../core/store/contentStore'
import { LiveViewContentBlockItems } from '../../core/content/types'
import ContentWrapper from '../components/ContentWrapper'
import ErrorBoundary from '../../ErrorBoundary'
import {
  calculateTweetFontSize,
  formatRelativeTime
} from './utils/textSizing'
import { extractVideoUrls, getBestTweetMedia, isQuoteTweet, extractQuotedTweetInfo, isTombstonedTweet } from '../../core/content/utils'

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

  // Check if this tweet has been tombstoned (deleted from Twitter)
  const isTombstoned = useMemo(() => {
    if (!tweet) return false
    return isTombstonedTweet(tweet)
  }, [tweet])

  // Check if this is a quote tweet with media in the quoted content
  const quoteTweetInfo = useMemo(() => {
    if (!tweet || isTombstoned) return null
    return extractQuotedTweetInfo(tweet)
  }, [tweet, isTombstoned])

  // Get the best media (from main tweet or quoted tweet)
  const bestMedia = useMemo(() => {
    if (!tweet) return { videoUrl: null, imageUrl: null, posterUrl: null, isFromQuotedTweet: false }
    return getBestTweetMedia(tweet)
  }, [tweet])

  // Extract media URLs from tweet data (legacy approach for non-quote tweets)
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

  // Determine final media URLs - now using bestMedia which checks quoted tweets
  const hasVideo = bestMedia.videoUrl != null
  const hasImage = bestMedia.imageUrl != null || contentThumbnail != null
  const hasMedia = hasVideo || hasImage

  // Select the best media URL based on what's available
  const finalVideoUrl = bestMedia.videoUrl || null
  const finalPosterUrl = bestMedia.posterUrl || contentThumbnail || null
  const finalImageUrl = bestMedia.imageUrl || contentThumbnail || null

  // Proxy Twitter images through our API to avoid 403 errors
  const thumbnailUrl = finalPosterUrl || finalImageUrl
    ? `/api/proxy-image?url=${encodeURIComponent(finalPosterUrl || finalImageUrl || '')}`
    : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg=='

  // Determine if we should show quote tweet overlay
  // Show overlay when: media is from quoted tweet AND main tweet has text (the comment)
  const showQuoteOverlay = bestMedia.isFromQuotedTweet && tweetText.trim().length > 0

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
        {isTombstoned ? (
          // Tweet was deleted from Twitter - show tombstone visual
          <TombstoneView
            active={isActive}
            itemId={item.id}
            tweetText={tweetText}
            authorName={displayName}
            authorHandle={handle}
          />
        ) : hasMedia ? (
          // Tweet with media: Show media (video or image)
          showQuoteOverlay ? (
            // Quote tweet with media from quoted content - show with comment overlay
            <QuoteTweetView
              thumbnailUrl={thumbnailUrl}
              videoUrl={finalVideoUrl || undefined}
              itemId={item.id}
              active={isActive}
              commentText={tweetText}
              commenterName={displayName}
              commenterHandle={handle}
              quotedAuthor={quoteTweetInfo?.authorUsername ? `@${quoteTweetInfo.authorUsername}` : undefined}
            />
          ) : (
            // Regular media tweet or quote tweet where main has media
            <SafePlaneView
              url={thumbnailUrl}
              active={isActive}
              videoUrl={finalVideoUrl || undefined}
              itemId={item.id}
            />
          )
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