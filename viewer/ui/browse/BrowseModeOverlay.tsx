'use client'

import React from 'react'
import { useBrowseModeStore } from '../../core/store/browseModeStore'
import { useViewModeStore, ViewMode } from '../../core/store/viewModeStore'
import { Eye, X } from 'lucide-react'
import { PillarBrowseActions } from './PillarBrowseActions'
import { usePillarBrowseInteractions } from '../../core/hooks/usePillarBrowseInteractions'

/**
 * Hints shown at the bottom for each view mode
 */
const VIEW_MODE_HINTS: Record<ViewMode, string> = {
  pillar: 'Drag to orbit & climb • Scroll to climb • TAB to exit',
  cloud: 'Drag to orbit • Scroll to zoom • TAB to exit',
  stack: 'Hover stack to preview • Click to select • TAB to exit',
  carousel: 'Drag to scroll • Arrow keys to navigate • TAB to exit',
}

/**
 * BrowseModeOverlay - UI overlay shown when browse mode is active
 *
 * Components:
 * - Status badge (top-left): "BROWSE MODE" indicator
 * - Action buttons (top-right): View-specific actions
 * - Hint bar (bottom): Controls hint for current view mode
 */
export function BrowseModeOverlay() {
  const isActive = useBrowseModeStore(state => state.isActive)
  const viewMode = useViewModeStore(state => state.viewMode)

  // Initialize pillar browse interactions (attaches event listeners when active)
  usePillarBrowseInteractions()

  // Don't render if browse mode is not active
  if (!isActive) return null

  const hint = VIEW_MODE_HINTS[viewMode]

  const handleExit = () => {
    useBrowseModeStore.getState().exitBrowseMode(true)
  }

  return (
    <>
      {/* Status Badge - Top Left */}
      <div className="fixed top-4 left-4 z-[150] flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/20 border border-orange-500/50 backdrop-blur-sm">
          <Eye className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-medium text-orange-300 uppercase tracking-wider">
            Browse Mode
          </span>
        </div>

        {/* Exit button */}
        <button
          onClick={handleExit}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-black/50 border border-white/20 hover:bg-white/10 hover:border-white/40 transition-colors"
          title="Exit Browse Mode (TAB or ESC)"
        >
          <X className="w-4 h-4 text-white/70" />
        </button>
      </div>

      {/* Action Buttons - Top Right */}
      <div className="fixed top-4 right-4 z-[150]">
        {viewMode === 'pillar' && <PillarBrowseActions />}
        {/* Future: CloudBrowseActions, StackBrowseActions, CarouselBrowseActions */}
      </div>

      {/* Hint Bar - Bottom Center */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[150]">
        <div className="px-4 py-2 rounded-full bg-black/70 border border-white/10 backdrop-blur-sm">
          <span className="text-sm text-white/60">{hint}</span>
        </div>
      </div>
    </>
  )
}

export default BrowseModeOverlay
