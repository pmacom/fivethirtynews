'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Star } from 'lucide-react'
import { useContentEditStore, ChannelGroup } from './contentEditStore'

interface ChannelPopoverProps {
  group: ChannelGroup
  anchorElement: HTMLElement
  onClose: () => void
}

export function ChannelPopover({ group, anchorElement, onClose }: ChannelPopoverProps) {
  const { selectedChannels, primaryChannel, toggleChannel, setPrimaryChannel } = useContentEditStore()
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  // Calculate position based on anchor element
  useEffect(() => {
    if (!anchorElement || !popoverRef.current) return

    const anchorRect = anchorElement.getBoundingClientRect()
    const popoverRect = popoverRef.current.getBoundingClientRect()

    // Position to the right of the channel groups list
    let left = anchorRect.right + 8
    let top = anchorRect.top

    // Ensure it doesn't go off screen
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    if (left + popoverRect.width > viewportWidth - 20) {
      left = anchorRect.left - popoverRect.width - 8
    }

    if (top + popoverRect.height > viewportHeight - 20) {
      top = viewportHeight - popoverRect.height - 20
    }

    setPosition({ top, left })
  }, [anchorElement])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        !anchorElement.contains(e.target as Node)
      ) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [anchorElement, onClose])

  return (
    <div
      ref={popoverRef}
      className="fixed z-[10000] min-w-[220px] max-w-[280px] bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden"
      style={{ top: position.top, left: position.left }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-700 bg-zinc-800/80">
        <span className="text-base">{group.icon || '📁'}</span>
        <span className="text-sm font-medium text-white">{group.name}</span>
      </div>

      {/* Channels list */}
      <div className="max-h-[300px] overflow-y-auto py-1">
        {group.channels.map((channel) => {
          const isSelected = selectedChannels.has(channel.slug)
          const isPrimary = channel.slug === primaryChannel

          return (
            <div
              key={channel.id}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                isSelected ? 'bg-green-500/10' : 'hover:bg-zinc-700/50'
              }`}
              onClick={() => toggleChannel(channel.slug)}
            >
              {/* Checkbox */}
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                  isSelected
                    ? 'bg-green-500 border-green-500'
                    : 'border-zinc-500'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>

              {/* Icon */}
              <span className="text-sm flex-shrink-0">{channel.icon || '#'}</span>

              {/* Name and description */}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{channel.name}</div>
                {channel.description && (
                  <div className="text-xs text-zinc-500 truncate">{channel.description}</div>
                )}
              </div>

              {/* Star button (only visible when selected) */}
              {isSelected && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setPrimaryChannel(channel.slug)
                  }}
                  className={`p-1 rounded transition-colors ${
                    isPrimary
                      ? 'text-yellow-400'
                      : 'text-zinc-500 hover:text-yellow-400'
                  }`}
                  title={isPrimary ? 'Primary channel' : 'Make primary'}
                >
                  <Star className={`w-4 h-4 ${isPrimary ? 'fill-current' : ''}`} />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ChannelPopover
