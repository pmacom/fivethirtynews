import React, { useState, useEffect, useRef } from 'react'
import { ContentStore } from "../Content/contentStore"
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion';
import SourceIcon from './components/icons/SourceIcon';
import { DetailNotes } from './components/DetailNotes';
import VideoBar from './components/VideoBar';
import SettingStore from "../Settings/settingsStore";
import { useStoreValue } from 'zustand-x';


export const Details = () => {
  const itemData = useStoreValue(ContentStore, 'activeItemData')
  const [opacity, setOpacity] = useState(1)
  const showSettings = useStoreValue(SettingStore, 'showSettings')

  const wrapperClasses = cn({
    'fixed bottom-0 left-0 z-[102]': true,
  })

  const classes = cn({
    'fivethirty-details': true,
    'fixed bottom-0 left-0 w-screen bg-black bg-opacity-30 text-white': true,
    'transition-all duration-500': true,
    'p-0 pl-0 pr-0': !itemData,
    'p-2 pl-4 pr-4 pb-[3.5rem]': !!itemData,
    'flex flex-col items-center': true,
    'hidden': showSettings,
  })
  
  const detailClasses = cn({
    'wtf-details-info' : true,
    'flex flex-row w-full items-center gap-2' : true,
    'bg-black bg-opacity-30' : true,
    'rounded-lg p-1': true,
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

  const videoSeekTime = useStoreValue(ContentStore, 'videoSeekTime')
  const isContentVideo = useStoreValue(ContentStore, 'isContentVideo')

  return (
    <div className={wrapperClasses}>
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
                <DetailNotes data={itemData} />

                <SourceIcon
                  type={itemData?.content.content_type}
                  url={itemData?.content.content_url}
                />
              </div>

              {isContentVideo && <VideoBar />}

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