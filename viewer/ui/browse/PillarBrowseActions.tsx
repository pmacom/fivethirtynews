'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Tag, Navigation } from 'lucide-react'
import { BrowseActionButton } from './BrowseActionButton'
import { useContentStore } from '../../core/store/contentStore'

/**
 * PillarBrowseActions - Action buttons specific to Pillar browse mode
 *
 * Actions:
 * - Group by Tag: Show tag sub-groups within categories
 * - Jump to Category: Quick navigation dropdown
 */
export function PillarBrowseActions() {
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [groupByTag, setGroupByTag] = useState(false)

  // Get category data from content store
  const content = useContentStore(state => state.content)
  const categoryIds = useContentStore(state => state.categoryIds)
  const categoryTitles = useContentStore(state => state.categoryTitles)
  const activeCategoryId = useContentStore(state => state.activeCategoryId)

  // Build categories array from store data
  const categories = useMemo(() => {
    return content.map((block, index) => ({
      id: categoryIds[index] || block.id,
      name: categoryTitles[index] || block.title || `Category ${index + 1}`,
      items: block.content_block_items,
    }))
  }, [content, categoryIds, categoryTitles])

  const handleToggleTagGrouping = useCallback(() => {
    setGroupByTag(prev => !prev)
    // TODO: Integrate with positioner to show tag sub-groups
  }, [])

  const handleJumpToCategory = useCallback((categoryId: string, categoryIndex: number) => {
    const category = categories[categoryIndex]
    const firstItem = category?.items?.[0]

    if (firstItem?.content) {
      useContentStore.setState({
        activeCategoryId: categoryId,
        activeCategoryIndex: categoryIndex,
        activeItemId: firstItem.content.id,
        activeItemData: firstItem,
        activeItemIndex: 0,
      })
    }

    setShowCategoryDropdown(false)
  }, [categories])

  return (
    <div className="flex items-center gap-2">
      {/* Group by Tag Button */}
      <BrowseActionButton
        onClick={handleToggleTagGrouping}
        icon={<Tag className="w-4 h-4" />}
        label="Group by Tag"
        isActive={groupByTag}
      />

      {/* Jump to Category Dropdown */}
      <div className="relative">
        <BrowseActionButton
          onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
          icon={<Navigation className="w-4 h-4" />}
          label="Jump to"
          isActive={showCategoryDropdown}
        />

        {showCategoryDropdown && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[140]"
              onClick={() => setShowCategoryDropdown(false)}
            />

            {/* Dropdown */}
            <div className="absolute top-full right-0 mt-2 z-[160] min-w-[200px] max-h-[300px] overflow-y-auto rounded-lg bg-black/95 border border-white/20 shadow-xl backdrop-blur-sm">
              {categories.length === 0 ? (
                <div className="px-4 py-3 text-sm text-white/50">
                  No categories
                </div>
              ) : (
                categories.map((category, index) => (
                  <button
                    key={category.id}
                    onClick={() => handleJumpToCategory(category.id, index)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 text-left
                      hover:bg-white/10 transition-colors
                      ${activeCategoryId === category.id
                        ? 'bg-orange-500/20 text-orange-300'
                        : 'text-white/70'
                      }
                    `}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0 bg-orange-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {category.name}
                      </div>
                      <div className="text-xs text-white/40">
                        {category.items?.length || 0} items
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default PillarBrowseActions
