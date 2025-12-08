'use client'

import { X, Star } from 'lucide-react'
import { useContentEditStore } from './contentEditStore'

export function SelectedChannelsBar() {
  const { selectedChannels, primaryChannel, channelsMap, toggleChannel, setPrimaryChannel } =
    useContentEditStore()

  if (selectedChannels.size === 0) {
    return (
      <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900/30">
        <div className="text-sm text-zinc-500 text-center">
          Click a category to add channels
        </div>
      </div>
    )
  }

  const selectedChannelsList = Array.from(selectedChannels).map((slug) => {
    const channel = channelsMap.get(slug)
    return {
      slug,
      name: channel?.name || slug,
      icon: channel?.icon || '#',
      isPrimary: slug === primaryChannel,
    }
  })

  return (
    <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900/30">
      <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
        Selected Channels ({selectedChannels.size})
      </div>
      <div className="flex flex-wrap gap-2">
        {selectedChannelsList.map((channel) => (
          <div
            key={channel.slug}
            className={`inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-md text-sm cursor-pointer transition-colors ${
              channel.isPrimary
                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700'
            }`}
            onClick={() => setPrimaryChannel(channel.slug)}
            title={channel.isPrimary ? 'Primary channel' : 'Click to make primary'}
          >
            {channel.isPrimary && <Star className="w-3 h-3 fill-current" />}
            <span>{channel.icon}</span>
            <span>{channel.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleChannel(channel.slug)
              }}
              className="p-0.5 ml-1 rounded hover:bg-zinc-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SelectedChannelsBar
