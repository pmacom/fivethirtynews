import React, { useState, useEffect, useRef } from 'react'
import { useContentStore } from '../../core/store/contentStore'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion';
import SourceIcon from './components/icons/SourceIcon';
import CopyButton from './components/icons/CopyButton';
import EditButton from './components/icons/EditButton';
import EditTagsButton from './components/icons/EditTagsButton';
import NotesButton from './components/icons/NotesButton';
import { DetailNotes } from './components/DetailNotes';
import { InlineNotesPanel } from './components/InlineNotesPanel';
import VideoBar from './components/VideoBar';
import { SubmitterInfo } from './components/SubmitterInfo';
import useSettingStore from '../settings/store';
import { useMobileLayout } from '../hooks/useMobileLayout';
import { MobileDetails } from '../mobile/MobileDetails';
import { useNotesStore } from '../notes/notesStore';


export const Details = () => {
  const { isMobile } = useMobileLayout()
  const activeItemData = useContentStore(state => state.activeItemData)
  const hoveredItemData = useContentStore(state => state.hoveredItemData)
  const [opacity, setOpacity] = useState(1)
  const [notesPanelOpen, setNotesPanelOpen] = useState(false)
  const [isNoteInputFocused, setIsNoteInputFocused] = useState(false)
  const showSettings = useSettingStore(state => state.showSettings)
  const isContentVideo = useContentStore(state => state.isContentVideo)
  const videoDuration = useContentStore(state => state.videoDuration)
  const { notes, fetchNotes, clearNotes } = useNotesStore()

  // Show hovered item if present, otherwise show active item
  const itemData = hoveredItemData || activeItemData
  const hasNotes = notes.length > 0

  // Fetch notes when content changes, close panel on content change
  useEffect(() => {
    const currentContentId = itemData?.content?.id || itemData?.content?.content_id
    if (currentContentId) {
      fetchNotes(currentContentId)
    } else {
      clearNotes()
    }
    // Close notes panel when content changes
    setNotesPanelOpen(false)
  }, [itemData?.content?.id, itemData?.content?.content_id, fetchNotes, clearNotes])

  // Use ref for timer so we can clear it from multiple effects
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Clear fade timer and keep UI visible when note input is focused
  useEffect(() => {
    if (isNoteInputFocused) {
      // Clear any pending fade timer
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current)
        fadeTimerRef.current = null
      }
      // Ensure UI is visible while typing
      setOpacity(1)
    }
  }, [isNoteInputFocused])

  // Mouse movement effect for desktop fade - must be before any conditional returns
  // Skip fade when note input is focused so user can type without UI disappearing
  useEffect(() => {
    if (isMobile) return // Skip on mobile

    const handleMouseMove = () => {
      setOpacity(1)
      // Clear any existing timer
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current)
        fadeTimerRef.current = null
      }
      // Don't start fade timer while note input is focused
      if (!isNoteInputFocused) {
        fadeTimerRef.current = setTimeout(() => setOpacity(0), 2000)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current)
      }
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [isMobile, isNoteInputFocused])

  // Use mobile version on small screens
  if (isMobile) {
    return <MobileDetails />
  }

  const wrapperClasses = cn({
    'fixed bottom-0 left-0 z-[102]': true,
  })

  const classes = cn({
    'fivethirty-details': true,
    'fixed bottom-0 left-0 w-screen text-white': true,
    'transition-all duration-500': true,
    'p-0': !itemData,
    'px-4 pb-[3.5rem]': !!itemData,
    'flex flex-col': true,
    'hidden': showSettings,
  })

  const detailClasses = cn({
    'wtf-details-info': true,
    'flex flex-row w-full items-center gap-3': true,
    'bg-black/60 backdrop-blur-md': true,
    'rounded-lg p-3': true,
  })

  // Check if content has video - use multiple signals for reliability
  // 1. content_type is 'video' (YouTube)
  // 2. isContentVideo flag is set (video texture loaded)
  // 3. videoDuration > 0 (video is playing with known duration)
  const hasVideo = itemData?.content?.content_type === 'video' ||
                   isContentVideo ||
                   videoDuration > 0

  // Content data for edit buttons
  const contentId = itemData?.content.id || itemData?.content.content_id || itemData?.id || ''
  const contentData = itemData ? {
    id: contentId,
    content_url: itemData.content.content_url,
    content_type: itemData.content.content_type,
    description: itemData.content.description,
    author_name: itemData.content.author_name,
    author_username: itemData.content.author_username,
  } : null

  return (
    <div className={wrapperClasses}>
      {/* Video progress bar - CSS opacity for smooth transitions */}
      <div
        className={cn(
          "fixed bottom-0 left-0 w-screen z-[103] px-4 pb-2",
          "bg-gradient-to-t from-black/60 to-transparent",
          "transition-opacity duration-500",
          hasVideo && itemData ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <VideoBar />
      </div>

      <AnimatePresence>
        {itemData ? (
          <motion.div
            key={itemData.id}
            initial={{ opacity: 0 }}
            animate={{ opacity }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <div className={classes}>
              {/* Main bar with all content */}
              <div className={detailClasses}>
                {/* Column 1: Left icons (vertical, space between) */}
                <div className="flex flex-col justify-between shrink-0 self-stretch py-1">
                  <SourceIcon
                    type={itemData.content.content_type}
                    url={itemData.content.content_url}
                  />
                  <CopyButton url={itemData.content.content_url} />
                </div>

                {/* Column 2+3: Author info + Content text (grows) */}
                <DetailNotes data={itemData} />

                {/* Column 4: Right section (vertical - buttons top, submitter bottom) */}
                <div className="flex flex-col items-end justify-between shrink-0 self-stretch">
                  {/* Edit buttons row */}
                  {contentData && (
                    <div className="flex items-center gap-1">
                      <EditButton contentId={contentId} contentData={contentData} />
                      <EditTagsButton contentId={contentId} contentData={contentData} />
                      <NotesButton
                        onToggle={() => setNotesPanelOpen(!notesPanelOpen)}
                        hasNotes={hasNotes}
                      />
                    </div>
                  )}

                  {/* Submitter info */}
                  <SubmitterInfo
                    submittedBy={itemData.content.submitted_by}
                    submittedAt={itemData.content.submitted_at}
                    authorUsername={itemData.content.author_username}
                  />
                </div>
              </div>

              {/* Inline Notes Panel (fixed position, outside bar) */}
              <AnimatePresence>
                {notesPanelOpen && contentId && (
                  <InlineNotesPanel
                    contentId={contentId}
                    onClose={() => setNotesPanelOpen(false)}
                    onInputFocusChange={setIsNoteInputFocused}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          <></>
        )}
      </AnimatePresence>
    </div>
  )
}


export default Details