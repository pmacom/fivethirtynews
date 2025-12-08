'use client'

import { useContentEditStore } from './contentEditStore'

interface ChannelGroupsListProps {
  onGroupClick: (groupId: string, element: HTMLElement) => void
}

export function ChannelGroupsList({ onGroupClick }: ChannelGroupsListProps) {
  const { channelGroups, selectedChannels, primaryChannel, activeGroupId } = useContentEditStore()

  // Check if a group has any selected channels
  const groupHasSelection = (groupId: string) => {
    const group = channelGroups.find((g) => g.id === groupId)
    if (!group) return false
    return group.channels.some((ch) => selectedChannels.has(ch.slug))
  }

  // Check if a group has the primary channel
  const groupHasPrimary = (groupId: string) => {
    const group = channelGroups.find((g) => g.id === groupId)
    if (!group || !primaryChannel) return false
    return group.channels.some((ch) => ch.slug === primaryChannel)
  }

  if (channelGroups.length === 0) {
    return (
      <div className="p-4 text-sm text-zinc-500">
        No channels available
      </div>
    )
  }

  return (
    <div className="py-2">
      <div className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">
        Channels
      </div>
      {channelGroups.map((group) => {
        const isActive = activeGroupId === group.id
        const hasSelection = groupHasSelection(group.id)
        const hasPrimary = groupHasPrimary(group.id)

        return (
          <button
            key={group.id}
            onClick={(e) => onGroupClick(group.id, e.currentTarget)}
            className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
              isActive
                ? 'bg-zinc-700/50 text-white'
                : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <span className="text-base flex-shrink-0">{group.icon || '📁'}</span>
            <span className="flex-1 text-sm truncate">{group.name}</span>
            {hasPrimary && (
              <span className="text-yellow-400 text-xs">★</span>
            )}
            {hasSelection && !hasPrimary && (
              <span className="w-2 h-2 rounded-full bg-green-500" />
            )}
          </button>
        )
      })}
    </div>
  )
}

export default ChannelGroupsList
