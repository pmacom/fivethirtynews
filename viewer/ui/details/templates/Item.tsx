import React, { useState } from 'react'
import { LiveViewContentBlockItems } from '@/viewer/core/content/types'

import { motion, AnimatePresence } from 'framer-motion'
import SourceIcon from '../components/icons/SourceIcon'
import SourceContent from '../components/icons/SourceContent'

interface DetailItemProps {
  itemIndex: number
  item: LiveViewContentBlockItems
}

function DetailItem({ item, itemIndex }: DetailItemProps) {
  const [hovered, setHovered] = useState<boolean>(false);

  return (
    <div
      key={item.id}
      className={`slide-detail text-white`}
    >
      <div 
        className="cursor-pointer border-2 border-red-500"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <SourceIcon type={item.content.content_type} url={item.content.content_url} />
      </div>
    
      <AnimatePresence>
        {hovered && ( // Animate only if hovered is true
          <motion.div
            key={item.id} // Ensure a unique key to trigger the animation on change
            initial={{ opacity: 0 }} // Initial state before animation
            animate={{ opacity: 1 }}  // State during animation
            exit={{ opacity: 0 }}     // State on exit
            transition={{ duration: 0.8 }} // Control animation duration
          >
            <SourceContent>
              {item.content.description}
            </SourceContent>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DetailItem;
