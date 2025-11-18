import { cn } from '@/lib/utils'
import React, { useMemo, useState } from 'react'
import { useContentStore } from '../../../core/store/contentStore'
import { AnimatePresence, motion } from 'framer-motion'

interface LegendItemsProps {
}
const LegendItems = ({  }:LegendItemsProps) => {
  const activeCategoryIndex = useContentStore(state => state.activeCategoryIndex)
  const ids = useContentStore(state => state.itemIds)
  const itemIds = ids[activeCategoryIndex] || []
  const activeItemId = useContentStore(state => state.activeItemId)
  const activeItemIndex = useContentStore(state => state.activeItemIndex)

  const items = useMemo(() => {
    return itemIds.map((id, itemIndex) => (
      <LegendItem key={id}
        index={itemIndex}
        active={activeItemIndex == itemIndex}
      />
    ))
  },[itemIds, activeItemId])
  
  return (
    <div className="legend-group legend-vertical">
      <div className="legend-inner">
        <AnimatePresence>
          {itemIds.map((id, itemIndex) => (
            <motion.div
              key={itemIndex}
              initial={{ opacity: 0, height: '0px' }}
              animate={{ opacity: 1, height: '10px' }}
              exit={{ opacity: 0, height: '0px' }}
            >
              <LegendItem
                index={itemIndex}
                active={activeItemIndex == itemIndex}
              />
            </motion.div>

          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}




interface LegendItemProps {
  index: number
  active?: boolean
  itemIds?: string[]
  children?: React.ReactNode
}
const LegendItem = ({ index, active, itemIds = [], children }:LegendItemProps) => {
  const classes = useMemo(() => cn({
    'legend-item': true,
    active
  }),[active])
  
  return (
    <div className={classes}>
      {/* <span className={classes}></span> */}
    </div>
  )
}

export default LegendItems