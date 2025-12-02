import { cn } from '@/lib/utils'
import React, { useMemo, useState } from 'react'
import { ContentStore } from "../../Content/contentStore"
import { AnimatePresence, motion } from 'framer-motion'
import { useStoreValue } from 'zustand-x'

const LegendItems = () => {
  const activeCategoryIndex = useStoreValue(ContentStore, 'activeCategoryIndex')
  const ids = useStoreValue(ContentStore, 'itemIds')
  const itemIds = ids[activeCategoryIndex] || []
  const activeItemId = useStoreValue(ContentStore, 'activeItemId')
  const activeItemIndex = useStoreValue(ContentStore, 'activeItemIndex')

  const items = useMemo(() => {
    return itemIds.map((id, itemIndex) => (
      <LegendItem key={id}
        index={itemIndex}
        active={activeItemIndex == itemIndex}
      />
    ))
  }, [itemIds, activeItemId, activeItemIndex])
  
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