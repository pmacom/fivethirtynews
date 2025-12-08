'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaCopy, FaCheck } from 'react-icons/fa'
import { FaYoutube, FaXTwitter } from 'react-icons/fa6'
import { ChevronUp, ChevronDown, ExternalLink, Edit3 } from 'lucide-react'
import { useContentStore, useTweetStore } from '../../core/store/contentStore'
import { ContentType, LiveViewContentBlockItems } from '../../core/content/types'
import useSettingStore from '../settings/store'
import VideoBar from '../details/components/VideoBar'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useContentEditStore } from '@/components/content-edit'

// Compact source icon for mobile
const MobileSourceIcon = ({ type, url }: { type: ContentType; url: string }) => {
  const getIcon = () => {
    switch (type) {
      case ContentType.VIDEO:
        return <FaYoutube className="w-4 h-4" />
      case ContentType.TWITTER:
        return <FaXTwitter className="w-4 h-4" />
      default:
        return <ExternalLink className="w-4 h-4" />
    }
  }

  return (
    <button
      onClick={() => window.open(url, '_blank')}
      className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 active:bg-white/20 transition-colors"
      title="Open source"
    >
      {getIcon()}
    </button>
  )
}

// Compact copy button for mobile
const MobileCopyButton = ({ url }: { url: string }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
        copied ? 'bg-green-500/30 text-green-400' : 'bg-white/10 text-white/70 active:bg-white/20'
      }`}
      title={copied ? 'Copied!' : 'Copy URL'}
    >
      {copied ? <FaCheck className="w-3 h-3" /> : <FaCopy className="w-3 h-3" />}
    </button>
  )
}

// Compact edit button for mobile (admin/mod only)
const MobileEditButton = ({ itemData }: { itemData: LiveViewContentBlockItems }) => {
  const { canEdit, loading } = useCurrentUser()
  const openEditModal = useContentEditStore((state) => state.open)

  if (loading || !canEdit) return null

  const handleClick = () => {
    const contentId = itemData.content.id || itemData.content.content_id || itemData.id
    openEditModal(contentId, {
      id: contentId,
      content_url: itemData.content.content_url,
      content_type: itemData.content.content_type,
      description: itemData.content.description,
      author_name: itemData.content.author_name,
      author_username: itemData.content.author_username,
    })
  }

  return (
    <button
      onClick={handleClick}
      className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 active:bg-white/20 transition-colors"
      title="Edit content"
    >
      <Edit3 className="w-4 h-4" />
    </button>
  )
}

// Format relative time
const formatRelativeTime = (dateString?: string) => {
  if (!dateString) return null
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

interface MobileDetailsContentProps {
  itemData: LiveViewContentBlockItems
  expanded: boolean
}

const MobileDetailsContent = ({ itemData, expanded }: MobileDetailsContentProps) => {
  const { content, note } = itemData
  const getTweet = useTweetStore(state => state.getTweet)

  // Get tweet data for fallbacks
  const tweetData = content.content_type === 'twitter' && content.content_id
    ? getTweet(content.content_id)?.data
    : null

  // Author info with fallbacks
  const authorName = content.author_name || tweetData?.user?.name
  const authorUsername = content.author_username || tweetData?.user?.screen_name
  const avatarUrl = content.author_avatar_url || tweetData?.user?.profile_image_url_https
  const hasAuthor = authorName || authorUsername

  // Display text
  const displayText = note || content.description || tweetData?.text

  // Date
  const displayDate = content.content_created_at || content.submitted_at
  const relativeTime = formatRelativeTime(displayDate)

  return (
    <div className="flex flex-col gap-2">
      {/* Top row: Avatar + User info + Action buttons */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        {hasAuthor && (
          avatarUrl ? (
            <img
              src={avatarUrl}
              alt={authorName || authorUsername || 'Author'}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center text-sm flex-shrink-0">
              {(authorName || authorUsername || '?')[0].toUpperCase()}
            </div>
          )
        )}

        {/* User info - grows to fill space */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {authorUsername && (
              <span className="text-sm font-medium text-white truncate">
                @{authorUsername}
              </span>
            )}
            {relativeTime && (
              <>
                <span className="text-white/30">·</span>
                <span className="text-xs text-white/50 flex-shrink-0">
                  {relativeTime}
                </span>
              </>
            )}
          </div>
          {authorName && authorName !== authorUsername && (
            <div className="text-xs text-white/60 truncate">
              {authorName}
            </div>
          )}
        </div>

        {/* Small action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <MobileCopyButton url={content.content_url} />
          <MobileSourceIcon type={content.content_type} url={content.content_url} />
          <MobileEditButton itemData={itemData} />
        </div>
      </div>

      {/* Content text */}
      {displayText && (
        <div className={`text-sm text-white/80 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
          {displayText}
        </div>
      )}

      {/* Expanded: show additional info */}
      {expanded && (
        <div className="pt-2 border-t border-white/10 text-xs text-white/50">
          {content.content_type && (
            <span className="capitalize">{content.content_type}</span>
          )}
          {content.submitted_by && content.submitted_by !== 'extension' && content.submitted_by !== authorUsername && (
            <span className="ml-2">· Added by {content.submitted_by}</span>
          )}
        </div>
      )}
    </div>
  )
}

export const MobileDetails = () => {
  const [expanded, setExpanded] = useState(false)
  const activeItemData = useContentStore(state => state.activeItemData)
  const hoveredItemData = useContentStore(state => state.hoveredItemData)
  const isContentVideo = useContentStore(state => state.isContentVideo)
  const showSettings = useSettingStore(state => state.showSettings)

  const itemData = hoveredItemData || activeItemData

  // Hide if no item or settings open
  if (!itemData || showSettings) return null

  const hasVideo = itemData?.content?.content_type === 'video' ||
    (itemData?.content?.content_type === 'twitter' && isContentVideo)

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[102]">
      {/* Video bar (if applicable) */}
      {hasVideo && (
        <div className="px-3 pb-1">
          <VideoBar />
        </div>
      )}

      {/* Details panel */}
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-black/80 backdrop-blur-md border-t border-white/10"
        >
          {/* Expand/collapse handle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center py-1 text-white/40 active:text-white/60"
          >
            {expanded ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronUp className="w-5 h-5" />
            )}
          </button>

          {/* Content */}
          <div className="px-4 pb-4">
            <MobileDetailsContent itemData={itemData} expanded={expanded} />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default MobileDetails
