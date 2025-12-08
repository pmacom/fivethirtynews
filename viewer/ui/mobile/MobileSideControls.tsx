'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { IoLayersOutline } from 'react-icons/io5'
import { CiSettings } from 'react-icons/ci'
import { Search, MoreHorizontal, X, Columns3, Cloud, Layers, GalleryHorizontal, LayoutGrid, Edit } from 'lucide-react'
import { useStageSelectStore } from '../stageselect/store'
import useSettingStore from '../settings/store'
import { useViewModeStore, VIEW_MODE_OPTIONS, ViewMode } from '../../core/store/viewModeStore'
import { useContentStore } from '../../core/store/contentStore'
import { useSearchOverlayStore, SearchContentItem } from '@/components/search/searchOverlayStore'
import { trackSearchRelationship } from '../../utils/trackRelationship'
import { getPlacementForViewMode, createContentBlockItem } from '../../core/content/placementStrategies'

const VIEW_MODE_ICONS: Record<ViewMode, React.ReactNode> = {
  pillar: <Columns3 className="w-5 h-5" />,
  cloud: <Cloud className="w-5 h-5" />,
  stack: <Layers className="w-5 h-5" />,
  carousel: <GalleryHorizontal className="w-5 h-5" />,
}

interface MobileSideControlsProps {
  showSlug?: string
  episodeId?: string
}

export const MobileSideControls = ({ showSlug, episodeId }: MobileSideControlsProps) => {
  const router = useRouter()
  const [overflowOpen, setOverflowOpen] = useState(false)

  // Store states
  const showStageSelect = useStageSelectStore(state => state.showStageSelect)
  const showSettings = useSettingStore(state => state.showSettings)
  const viewMode = useViewModeStore(state => state.viewMode)
  const setViewMode = useViewModeStore(state => state.setViewMode)
  const contentEpisodeId = useContentStore(state => state.episodeId)
  const activeItemData = useContentStore(state => state.activeItemData)
  const addContent = useContentStore(state => state.addContent)
  const openSearchOverlay = useSearchOverlayStore(state => state.open)

  const activeEpisodeId = episodeId || contentEpisodeId

  const toggleStageSelect = useCallback(() => {
    useStageSelectStore.setState({ showStageSelect: !showStageSelect })
    setOverflowOpen(false)
  }, [showStageSelect])

  const toggleSettings = useCallback(() => {
    useSettingStore.setState({ showSettings: !showSettings })
    setOverflowOpen(false)
  }, [showSettings])

  const handleCurate = useCallback(() => {
    if (showSlug && activeEpisodeId) {
      router.push(`/show/${showSlug}/episode/${activeEpisodeId}/curate`)
    }
    setOverflowOpen(false)
  }, [router, showSlug, activeEpisodeId])

  const handleEdit = useCallback(() => {
    if (showSlug && activeEpisodeId) {
      router.push(`/show/${showSlug}/episode/${activeEpisodeId}/edit`)
    }
    setOverflowOpen(false)
  }, [router, showSlug, activeEpisodeId])

  const handleSearchConfirm = useCallback((items: SearchContentItem[]) => {
    if (items.length === 0) return
    const currentId = activeItemData?.content?.content_id || activeItemData?.content?.id
    const placement = getPlacementForViewMode(viewMode, items.length)
    const newItems = items.map(item => createContentBlockItem(item))
    addContent(newItems, placement)
    if (currentId) {
      items.forEach(item => trackSearchRelationship(currentId, item.id))
    }
  }, [activeItemData, viewMode, addContent])

  const handleOpenSearch = useCallback(() => {
    openSearchOverlay('3d-viewer', handleSearchConfirm)
  }, [openSearchOverlay, handleSearchConfirm])

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode)
    setOverflowOpen(false)
  }, [setViewMode])

  return (
    <>
      {/* Fixed side controls - right edge, vertically centered */}
      <div className="fixed right-3 top-1/2 -translate-y-1/2 z-[103] flex flex-col gap-2">
        {/* Search Button */}
        <button
          onClick={handleOpenSearch}
          className="w-11 h-11 rounded-full bg-black/70 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white active:scale-95 transition-transform"
          title="Search"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Stage Select Button */}
        <button
          onClick={toggleStageSelect}
          className={`w-11 h-11 rounded-full bg-black/70 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white active:scale-95 transition-transform ${
            showStageSelect ? 'bg-white/30 border-white/40' : ''
          }`}
          title="Stage Select"
        >
          <IoLayersOutline className="w-5 h-5" />
        </button>

        {/* Overflow Menu Button */}
        <button
          onClick={() => setOverflowOpen(!overflowOpen)}
          className={`w-11 h-11 rounded-full bg-black/70 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white active:scale-95 transition-transform ${
            overflowOpen ? 'bg-white/30 border-white/40' : ''
          }`}
          title="More options"
        >
          {overflowOpen ? <X className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
        </button>
      </div>

      {/* Overflow Menu Popover */}
      <AnimatePresence>
        {overflowOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[102]"
              onClick={() => setOverflowOpen(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="fixed right-16 top-1/2 -translate-y-1/2 z-[103] min-w-[200px] rounded-xl bg-black/90 backdrop-blur-md border border-white/20 overflow-hidden shadow-2xl"
            >
              {/* View Mode Section */}
              <div className="p-2 border-b border-white/10">
                <div className="px-3 py-1 text-xs text-white/50 uppercase tracking-wide">View Mode</div>
                <div className="grid grid-cols-2 gap-1 p-1">
                  {VIEW_MODE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleViewModeChange(option.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                        viewMode === option.value
                          ? 'bg-white/20 text-white'
                          : 'text-white/70 active:bg-white/10'
                      }`}
                    >
                      {VIEW_MODE_ICONS[option.value]}
                      <span className="text-sm">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions Section */}
              <div className="p-2">
                <div className="px-3 py-1 text-xs text-white/50 uppercase tracking-wide">Actions</div>

                {/* Settings */}
                <button
                  onClick={toggleSettings}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                    showSettings ? 'bg-white/20 text-white' : 'text-white/70 active:bg-white/10'
                  }`}
                >
                  <CiSettings className="w-5 h-5" />
                  <span className="text-sm">Settings</span>
                </button>

                {/* Curate - only if episode context */}
                {showSlug && activeEpisodeId && (
                  <button
                    onClick={handleCurate}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-white/70 active:bg-white/10 transition-colors"
                  >
                    <LayoutGrid className="w-5 h-5" />
                    <span className="text-sm">Curate</span>
                  </button>
                )}

                {/* Edit - only if episode context */}
                {showSlug && activeEpisodeId && (
                  <button
                    onClick={handleEdit}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-white/70 active:bg-white/10 transition-colors"
                  >
                    <Edit className="w-5 h-5" />
                    <span className="text-sm">Edit</span>
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default MobileSideControls
