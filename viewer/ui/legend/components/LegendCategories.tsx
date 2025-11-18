import { cn } from '@/lib/utils'
import React, { useMemo, useState } from 'react'
import { useContentStore } from '../../../core/store/contentStore'
import { AnimatePresence, motion } from 'framer-motion'

export const LegendCategories = () => {
  const categoryIds = useContentStore(state => state.categoryIds)
  const categoryTitles = useContentStore(state => state.categoryTitles)
  const activeCategoryIndex = useContentStore(state => state.activeCategoryIndex)
  const categories = useMemo(() => categoryIds.map((categoryId, categoryIndex) => (
    <LegendCategory
      key={categoryId}
      title={categoryTitles[categoryIndex]}
      active={categoryIndex == activeCategoryIndex}
      categoryIndex={categoryIndex}
    />
  )),[categoryIds, categoryTitles, activeCategoryIndex])

  return (
    <div className="fivethirty-ui fivethirty-ui-container legend-group legend-horizontal">
      <div className="legend-inner">
        {categories}
      </div>
    </div>
  )
}

interface LegendCategoryProps {
  title: string
  categoryIndex: number
  active: boolean
}
const LegendCategory = ({ title, categoryIndex, active }:LegendCategoryProps) => {

  const classes = cn({
    'legend-item': true,
    active
  })
  
  return (
    <div className={classes}>
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
            exit={{ opacity: 0, scale: 3, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
            className="legend-item-label"
          >
            <div className="legend-item-label-inner">
              <div className="legend-item-label-text">
                {title}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default LegendCategories