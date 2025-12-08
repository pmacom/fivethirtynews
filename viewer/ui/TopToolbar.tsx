"use client"

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { IoLayersOutline } from 'react-icons/io5'
import { CiSettings } from 'react-icons/ci'
import { LayoutGrid, Edit, Columns3, Cloud, Layers, GalleryHorizontal, ArrowLeft, ArrowRight, ChevronLeft, Search } from 'lucide-react'
import { useStageSelectStore } from './stageselect/store'
import useSettingStore from './settings/store'
import { useViewModeStore, VIEW_MODE_OPTIONS, ViewMode } from '../core/store/viewModeStore'
import { useContentStore } from '../core/store/contentStore'
import { trackSearchRelationship } from '../utils/trackRelationship'
import { getPlacementForViewMode, createContentBlockItem } from '../core/content/placementStrategies'
import { useSearchOverlayStore, SearchContentItem } from '@/components/search/searchOverlayStore'
import { KeyboardShortcutsPopup } from './KeyboardShortcutsPopup'

interface EpisodeNavigation {
  prev: { id: string; episode_number: number; title: string } | null
  next: { id: string; episode_number: number; title: string } | null
}

const VIEW_MODE_ICONS: Record<ViewMode, React.ReactNode> = {
  pillar: <Columns3 className="w-5 h-5" />,
  cloud: <Cloud className="w-5 h-5" />,
  stack: <Layers className="w-5 h-5" />,
  carousel: <GalleryHorizontal className="w-5 h-5" />,
}

interface ToolbarButtonProps {
  onClick: () => void
  title: string
  children: React.ReactNode
  isActive?: boolean
}

const ToolbarButton = ({ onClick, title, children, isActive }: ToolbarButtonProps) => (
  <div
    onClick={onClick}
    className={`wtf--ui--container rounded cursor-pointer transition-all duration-200 hover:scale-110 ${
      isActive ? 'bg-white/30' : ''
    }`}
    title={title}
  >
    {children}
  </div>
)

interface TopToolbarProps {
  showSlug?: string
  episodeId?: string
  showName?: string
  episodeNumber?: number
  episodeTitle?: string
  navigation?: EpisodeNavigation
}

export const TopToolbar = ({
  showSlug,
  episodeId,
  showName,
  episodeNumber,
  episodeTitle,
  navigation
}: TopToolbarProps) => {
  const router = useRouter()
  const [viewModeOpen, setViewModeOpen] = useState(false)

  // Store states
  const showStageSelect = useStageSelectStore(state => state.showStageSelect)
  const showSettings = useSettingStore(state => state.showSettings)
  const viewMode = useViewModeStore(state => state.viewMode)
  const setViewMode = useViewModeStore(state => state.setViewMode)
  const contentEpisodeId = useContentStore(state => state.episodeId)
  const activeItemData = useContentStore(state => state.activeItemData)
  const addContent = useContentStore(state => state.addContent)
  const openSearchOverlay = useSearchOverlayStore(state => state.open)

  // Use provided episodeId or fall back to content store
  const activeEpisodeId = episodeId || contentEpisodeId

  const toggleStageSelect = useCallback(() => {
    useStageSelectStore.setState({ showStageSelect: !showStageSelect })
  }, [showStageSelect])

  const toggleSettings = useCallback(() => {
    useSettingStore.setState({ showSettings: !showSettings })
  }, [showSettings])

  const handleCurate = useCallback(() => {
    if (showSlug && activeEpisodeId) {
      router.push(`/show/${showSlug}/episode/${activeEpisodeId}/curate`)
    }
  }, [router, showSlug, activeEpisodeId])

  const handleEdit = useCallback(() => {
    if (showSlug && activeEpisodeId) {
      router.push(`/show/${showSlug}/episode/${activeEpisodeId}/edit`)
    }
  }, [router, showSlug, activeEpisodeId])

  // Handle adding multiple content items to the 3D scene from search
  const handleSearchConfirm = useCallback((items: SearchContentItem[]) => {
    if (items.length === 0) return

    const currentId = activeItemData?.content?.content_id || activeItemData?.content?.id

    // Get placement strategy for current view mode
    const placement = getPlacementForViewMode(viewMode, items.length)

    // Create content block items for all selected items
    const newItems = items.map(item => createContentBlockItem(item))

    // Add all items to content store with view-specific placement
    addContent(newItems, placement)

    // Track relationships for all items
    if (currentId) {
      items.forEach(item => trackSearchRelationship(currentId, item.id))
    }
  }, [activeItemData, viewMode, addContent])

  // Open search overlay in 3D viewer mode
  const handleOpenSearch = useCallback(() => {
    openSearchOverlay('3d-viewer', handleSearchConfirm)
  }, [openSearchOverlay, handleSearchConfirm])

  return (
    <div className="fixed top-0 right-0 z-[103] p-4">
      <div className="flex items-center gap-2">
        {/* Episode Navigation - show name, episode info, prev/next */}
        {showSlug && showName && episodeNumber && (
          <>
            {/* Back to show */}
            <div
              onClick={() => router.push(`/show/${showSlug}`)}
              className="wtf--ui--container rounded cursor-pointer transition-all duration-200 hover:scale-105 flex items-center gap-1"
              title={`Back to ${showName}`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm font-medium pr-1">{showName}</span>
            </div>

            {/* Episode info */}
            <div className="flex items-center gap-1 text-white/80 px-2">
              <span className="font-bold text-sm">#{episodeNumber}</span>
              {episodeTitle && (
                <span className="text-white/60 text-sm hidden md:inline max-w-[150px] truncate">
                  {episodeTitle}
                </span>
              )}
            </div>

            {/* Prev/Next navigation */}
            {navigation && (
              <div className="flex items-center gap-1">
                <div
                  onClick={() => navigation.prev && router.push(`/show/${showSlug}/${navigation.prev.episode_number}`)}
                  className={`wtf--ui--container rounded cursor-pointer transition-all duration-200 hover:scale-105 ${!navigation.prev ? 'opacity-30 cursor-not-allowed' : ''}`}
                  title={navigation.prev ? `Episode #${navigation.prev.episode_number}` : 'No previous episode'}
                >
                  <ArrowLeft className="w-4 h-4" />
                </div>
                <div
                  onClick={() => navigation.next && router.push(`/show/${showSlug}/${navigation.next.episode_number}`)}
                  className={`wtf--ui--container rounded cursor-pointer transition-all duration-200 hover:scale-105 ${!navigation.next ? 'opacity-30 cursor-not-allowed' : ''}`}
                  title={navigation.next ? `Episode #${navigation.next.episode_number}` : 'No next episode'}
                >
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            )}

            {/* Separator */}
            <div className="w-px h-6 bg-white/20 mx-1" />
          </>
        )}

        {/* View Mode Selector */}
        <div className="relative">
          <ToolbarButton
            onClick={() => setViewModeOpen(!viewModeOpen)}
            title={`View: ${VIEW_MODE_OPTIONS.find(o => o.value === viewMode)?.label}`}
          >
            {VIEW_MODE_ICONS[viewMode]}
          </ToolbarButton>

          {viewModeOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setViewModeOpen(false)}
              />

              {/* Dropdown - positioned below button, aligned right */}
              <div className="absolute top-[calc(100%+0.5rem)] right-0 z-[200] min-w-[180px] rounded-lg bg-black/95 border border-white/20 overflow-hidden shadow-2xl backdrop-blur-sm">
                {VIEW_MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setViewMode(option.value)
                      setViewModeOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition-colors ${
                      viewMode === option.value ? 'bg-white/10 text-white' : 'text-white/70'
                    }`}
                  >
                    {VIEW_MODE_ICONS[option.value]}
                    <div>
                      <div className="text-sm font-medium">{option.label}</div>
                      <div className="text-xs text-white/50">{option.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Search Button */}
        <ToolbarButton onClick={handleOpenSearch} title="Search (⌘K)">
          <Search className="w-5 h-5" />
        </ToolbarButton>

        {/* Curate Button - only show if we have episode context */}
        {showSlug && activeEpisodeId && (
          <ToolbarButton onClick={handleCurate} title="Curate">
            <LayoutGrid className="w-5 h-5" />
          </ToolbarButton>
        )}

        {/* Edit Button - only show if we have episode context */}
        {showSlug && activeEpisodeId && (
          <ToolbarButton onClick={handleEdit} title="Edit">
            <Edit className="w-5 h-5" />
          </ToolbarButton>
        )}

        {/* Stage Select Button */}
        <ToolbarButton
          onClick={toggleStageSelect}
          title="Stage Select"
          isActive={showStageSelect}
        >
          <IoLayersOutline className="w-5 h-5" />
        </ToolbarButton>

        {/* Settings Button */}
        <ToolbarButton
          onClick={toggleSettings}
          title="Settings"
          isActive={showSettings}
        >
          <CiSettings className="w-5 h-5" />
        </ToolbarButton>
      </div>

      {/* Keyboard Shortcuts - always visible with toolbar */}
      <KeyboardShortcutsPopup />
    </div>
  )
}

export default TopToolbar
