"use client"

import React, { useState } from 'react'
import { useViewModeStore, VIEW_MODE_OPTIONS, ViewMode } from '../core/store/viewModeStore'
import { Columns3, Cloud, Layers, GalleryHorizontal, ChevronDown } from 'lucide-react'

const VIEW_MODE_ICONS: Record<ViewMode, React.ReactNode> = {
  pillar: <Columns3 className="w-4 h-4" />,
  cloud: <Cloud className="w-4 h-4" />,
  stack: <Layers className="w-4 h-4" />,
  carousel: <GalleryHorizontal className="w-4 h-4" />,
}

export const ViewModeSelector = () => {
  const [isOpen, setIsOpen] = useState(false)
  const viewMode = useViewModeStore(state => state.viewMode)
  const setViewMode = useViewModeStore(state => state.setViewMode)

  const currentOption = VIEW_MODE_OPTIONS.find(o => o.value === viewMode)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/50 hover:bg-black/70 border border-white/20 text-white/80 hover:text-white transition-colors"
      >
        {VIEW_MODE_ICONS[viewMode]}
        <span className="text-sm font-medium">{currentOption?.label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown - appears above the button */}
          <div className="absolute bottom-full left-0 mb-2 z-50 min-w-[180px] rounded-lg bg-black/90 border border-white/20 overflow-hidden shadow-xl">
            {VIEW_MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setViewMode(option.value)
                  setIsOpen(false)
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
  )
}

export default ViewModeSelector
