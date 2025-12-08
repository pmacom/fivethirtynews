"use client"

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ThumbsUp, ThumbsDown, X, Loader2 } from 'lucide-react'
import { useContentStore } from '../core/store/contentStore'
import { useFloatingContentStore } from '../core/store/floatingContentStore'
import { cn } from '@/lib/utils'

/**
 * FloatingContentFeedback
 *
 * Shows thumbs up/down buttons when hovering over floating content items.
 * Allows users to vote on whether the suggested content pairing is relevant.
 */
export const FloatingContentFeedback = () => {
  const [isVoting, setIsVoting] = useState(false)
  const [voted, setVoted] = useState<'agree' | 'disagree' | null>(null)

  // Get hovered and active items from store
  const hoveredItemData = useContentStore(state => state.hoveredItemData)
  const activeItemData = useContentStore(state => state.activeItemData)
  const activeCategoryId = useContentStore(state => state.activeCategoryId)
  const removeFloatingItem = useFloatingContentStore(state => state.removeFloatingItem)

  // Only show for floating items (not when hovering the active item)
  const isFloatingItem = hoveredItemData?.content_block_id === 'search' ||
                         hoveredItemData?.content_block_id === 'floating'

  const hoveredContentId = hoveredItemData?.content?.content_id || hoveredItemData?.content?.id
  const activeContentId = activeItemData?.content?.content_id || activeItemData?.content?.id

  // Don't show if hovering the active item or if not a floating item
  const shouldShow = isFloatingItem &&
                     hoveredContentId &&
                     activeContentId &&
                     hoveredContentId !== activeContentId

  // Handle voting
  const handleVote = useCallback(async (vote: 'agree' | 'disagree') => {
    if (!hoveredContentId || !activeContentId || isVoting) return

    setIsVoting(true)

    try {
      const res = await fetch('/api/content/relationships/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId1: activeContentId,
          contentId2: hoveredContentId,
          vote,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setVoted(vote)

        // If user disagrees, remove the item from orbit after animation
        if (vote === 'disagree') {
          setTimeout(() => {
            removeFloatingItem(hoveredContentId)
          }, 500)
        }
      }
    } catch (error) {
      console.error('Error voting:', error)
    } finally {
      setIsVoting(false)
    }
  }, [hoveredContentId, activeContentId, isVoting, removeFloatingItem])

  // Handle dismiss (remove without voting)
  const handleDismiss = useCallback(() => {
    if (hoveredContentId) {
      removeFloatingItem(hoveredContentId)
    }
  }, [hoveredContentId, removeFloatingItem])

  // Reset voted state when hovered item changes
  React.useEffect(() => {
    setVoted(null)
  }, [hoveredContentId])

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[104]"
        >
          <div className="bg-black/80 backdrop-blur-md rounded-xl border border-white/20 p-3 shadow-2xl">
            {/* Context info */}
            <div className="text-center mb-2">
              <span className="text-white/60 text-xs">
                Related to current content
              </span>
            </div>

            {/* Vote buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleVote('agree')}
                disabled={isVoting || voted !== null}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all',
                  'text-sm font-medium',
                  voted === 'agree'
                    ? 'bg-green-500 text-white'
                    : 'bg-white/10 text-white/80 hover:bg-green-500/20 hover:text-green-400',
                  (isVoting || voted !== null) && 'opacity-50 cursor-not-allowed'
                )}
                title="This is relevant"
              >
                {isVoting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ThumbsUp className={cn('w-4 h-4', voted === 'agree' && 'fill-current')} />
                )}
                <span>Relevant</span>
              </button>

              <button
                onClick={() => handleVote('disagree')}
                disabled={isVoting || voted !== null}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all',
                  'text-sm font-medium',
                  voted === 'disagree'
                    ? 'bg-red-500 text-white'
                    : 'bg-white/10 text-white/80 hover:bg-red-500/20 hover:text-red-400',
                  (isVoting || voted !== null) && 'opacity-50 cursor-not-allowed'
                )}
                title="Not relevant"
              >
                {isVoting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ThumbsDown className={cn('w-4 h-4', voted === 'disagree' && 'fill-current')} />
                )}
                <span>Not relevant</span>
              </button>

              {/* Dismiss button */}
              <button
                onClick={handleDismiss}
                disabled={isVoting}
                className={cn(
                  'p-2 rounded-lg transition-all',
                  'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white',
                  isVoting && 'opacity-50 cursor-not-allowed'
                )}
                title="Dismiss (don't vote)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Feedback after voting */}
            {voted && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-center mt-2 pt-2 border-t border-white/10"
              >
                <span className="text-white/60 text-xs">
                  {voted === 'agree'
                    ? 'Thanks! This helps improve suggestions.'
                    : 'Removing from suggestions...'}
                </span>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default FloatingContentFeedback
