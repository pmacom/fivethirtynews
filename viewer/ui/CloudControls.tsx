"use client"

import React, { useState } from 'react'
import { Cloud, Layers, Grid3X3, RotateCcw, ZoomIn, ZoomOut, ChevronDown } from 'lucide-react'
import { useCloudViewStore, ORGANIZATION_MODE_OPTIONS, CloudOrganizationMode } from '../core/store/cloudViewStore'
import { useViewModeStore } from '../core/store/viewModeStore'

const MODE_ICONS: Record<CloudOrganizationMode, React.ReactNode> = {
  random: <Cloud className="w-4 h-4" />,
  clustered: <Layers className="w-4 h-4" />,
  grid: <Grid3X3 className="w-4 h-4" />,
  spiral: <RotateCcw className="w-4 h-4" />,
}

export const CloudControls = () => {
  const [isOpen, setIsOpen] = useState(false)

  // Only show when in cloud view mode
  const viewMode = useViewModeStore(state => state.viewMode)
  const zoomLevel = useCloudViewStore(state => state.zoomLevel)
  const organizationMode = useCloudViewStore(state => state.organizationMode)
  const setOrganizationMode = useCloudViewStore(state => state.setOrganizationMode)
  const toggleZoom = useCloudViewStore(state => state.toggleZoom)

  // Don't render if not in cloud mode
  if (viewMode !== 'cloud') return null

  const currentOption = ORGANIZATION_MODE_OPTIONS.find(o => o.value === organizationMode)

  return (
    <div className="fixed bottom-4 left-4 z-[103] flex items-center gap-2">
      {/* Organization Mode Selector */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/70 hover:bg-black/80 border border-white/20 text-white/80 hover:text-white transition-colors backdrop-blur-sm"
        >
          {MODE_ICONS[organizationMode]}
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

            {/* Dropdown - appears above */}
            <div className="absolute bottom-full left-0 mb-2 z-50 min-w-[180px] rounded-lg bg-black/95 border border-white/20 overflow-hidden shadow-2xl backdrop-blur-sm">
              {ORGANIZATION_MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setOrganizationMode(option.value)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition-colors ${
                    organizationMode === option.value ? 'bg-white/10 text-white' : 'text-white/70'
                  }`}
                >
                  {MODE_ICONS[option.value]}
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

      {/* Zoom Toggle Button */}
      <button
        onClick={toggleZoom}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/70 hover:bg-black/80 border border-white/20 text-white/80 hover:text-white transition-colors backdrop-blur-sm"
        title={zoomLevel === 'distant' ? 'Zoom in (Enter)' : 'Zoom out (Escape)'}
      >
        {zoomLevel === 'distant' ? (
          <>
            <ZoomIn className="w-4 h-4" />
            <span className="text-sm">Focus</span>
          </>
        ) : (
          <>
            <ZoomOut className="w-4 h-4" />
            <span className="text-sm">Overview</span>
          </>
        )}
      </button>

      {/* Hint text */}
      <div className="text-white/40 text-xs ml-2 hidden md:block">
        {zoomLevel === 'distant'
          ? 'Click item or ↑↓←→ to select • Enter to focus'
          : 'Scroll or Esc to zoom out • ←→ to navigate'
        }
      </div>
    </div>
  )
}

export default CloudControls
