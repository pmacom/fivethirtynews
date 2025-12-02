import React, { useState, useEffect, useRef } from 'react'
import { useContentStore } from '../../core/store/contentStore'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion';
import SourceIcon from './components/icons/SourceIcon';
import CopyButton from './components/icons/CopyButton';
import { DetailNotes } from './components/DetailNotes';
import VideoBar from './components/VideoBar';
import { SubmitterInfo } from './components/SubmitterInfo';
import useSettingStore from '../settings/store';


export const Details = () => {
  const itemData = useContentStore(state => state.activeItemData)
  const [opacity, setOpacity] = useState(1)
  const showSettings = useSettingStore(state => state.showSettings)

  const wrapperClasses = cn({
    'fixed bottom-0 left-0 z-[102]': true,
  })

  const classes = cn({
    'fivethirty-details': true,
    'fixed bottom-0 left-0 w-screen bg-black/50 text-white': true,
    'transition-all duration-500': true,
    'p-0 pl-0 pr-0': !itemData,
    'p-2 pl-4 pr-4 pb-[3.5rem]': !!itemData,
    'flex flex-col items-center': true,
    'hidden': showSettings,
    'backdrop-blur-md': true,
  })

  const detailClasses = cn({
    'wtf-details-info' : true,
    'flex flex-row w-full items-center gap-2' : true,
    'bg-black bg-opacity-40' : true,
    'rounded-lg p-2': true,
  })

  useEffect(() => {
    let timer: NodeJS.Timeout
    const handleMouseMove = () => {
      setOpacity(1)
      clearTimeout(timer)
      timer = setTimeout(() => setOpacity(0), 2000)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  const videoSeekTime = useContentStore(state => state.videoSeekTime)
  const isContentVideo = useContentStore(state => state.isContentVideo)

  // Check if content is video type directly (more reliable than state)
  const hasVideo = itemData?.content?.content_type === 'video' ||
                   (itemData?.content?.content_type === 'twitter' && isContentVideo)

  return (
    <div className={wrapperClasses}>
      {/* Video progress bar - always visible when video is active */}
      {itemData && hasVideo && (
        <div className="fixed bottom-0 left-0 w-screen z-[103] px-4 pb-2 bg-gradient-to-t from-black/60 to-transparent">
          <VideoBar />
        </div>
      )}

      <AnimatePresence>
        { itemData ? (
          <motion.div
            key={itemData.id}
            initial={{ opacity: 0 }}
            animate={{ opacity }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <div className={classes}>

              <div className={detailClasses}>
                {/* Buttons on the left */}
                <CopyButton
                  url={itemData?.content.content_url}
                />

                <SourceIcon
                  type={itemData?.content.content_type}
                  url={itemData?.content.content_url}
                />

                {/* Main content info in center (grows) */}
                <DetailNotes data={itemData} />

                {/* Submitter info on the right */}
                <SubmitterInfo
                  submittedBy={itemData?.content.submitted_by}
                  submittedAt={itemData?.content.submitted_at}
                  authorUsername={itemData?.content.author_username}
                />
              </div>

            </div>
          </motion.div>
        ):(
          <></>
        )}
    </AnimatePresence>
    </div>
  )
}


export default Details