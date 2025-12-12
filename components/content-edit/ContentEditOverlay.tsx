'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2 } from 'lucide-react'
import { useContentEditStore } from './contentEditStore'
import { ChannelGroupsList } from './ChannelGroupsList'
import { ChannelPopover } from './ChannelPopover'
import { TagsTab } from './TagsTab'
import { NotesTab } from './NotesTab'
import { SelectedChannelsBar } from './SelectedChannelsBar'

export function ContentEditOverlay() {
  const {
    isOpen,
    contentData,
    loading,
    saving,
    error,
    activeTab,
    activeGroupId,
    channelGroups,
    selectedTags,
    allNotes,
    mediaFocus,
    setActiveTab,
    setActiveGroupId,
    toggleMediaFocus,
    close,
    save,
  } = useContentEditStore()

  // Portal mount state
  const [mounted, setMounted] = useState(false)

  // Ref for the group button that was clicked (for popover positioning)
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null)

  // Mount portal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeGroupId) {
          setActiveGroupId(null)
          setPopoverAnchor(null)
        } else {
          close()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, activeGroupId, setActiveGroupId, close])

  // Handle group click
  const handleGroupClick = (groupId: string, element: HTMLElement) => {
    if (activeGroupId === groupId) {
      setActiveGroupId(null)
      setPopoverAnchor(null)
    } else {
      setActiveGroupId(groupId)
      setPopoverAnchor(element)
    }
  }

  // Handle save
  const handleSave = async () => {
    const success = await save()
    if (success) {
      close()
    }
  }

  // Close popover when clicking outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (activeGroupId) {
        setActiveGroupId(null)
        setPopoverAnchor(null)
      } else {
        close()
      }
    }
  }

  // Don't render until mounted or if not open
  if (!mounted || !isOpen) return null

  // Find active group for popover
  const activeGroup = channelGroups.find((g) => g.id === activeGroupId)

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Full-screen blur backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={handleBackdropClick} />

      {/* Modal container */}
      <div className="relative z-10 w-full max-w-3xl max-h-[85vh] mx-4 bg-zinc-900/95 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-white">Edit Content</h2>
            {contentData && (
              <p className="text-sm text-zinc-400 truncate max-w-md">
                {contentData.title || contentData.description || contentData.content_url}
              </p>
            )}
          </div>
          <button onClick={close} className="p-1 text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media Focus Toggle */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-800/30">
          <span className="text-sm text-zinc-400">Media is the focus (text is secondary)</span>
          <button
            onClick={toggleMediaFocus}
            className={`relative w-10 h-6 rounded-full transition-colors ${
              mediaFocus ? 'bg-green-500' : 'bg-zinc-700'
            }`}
            aria-pressed={mediaFocus}
            aria-label="Toggle media focus"
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                mediaFocus ? 'translate-x-4' : ''
              }`}
            />
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Left column: Channel groups */}
            <div className="w-48 border-r border-zinc-800 overflow-y-auto">
              <ChannelGroupsList onGroupClick={handleGroupClick} />
            </div>

            {/* Right panel: Tabs */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Tab bar */}
              <div className="flex border-b border-zinc-800">
                <button
                  onClick={() => setActiveTab('tags')}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === 'tags'
                      ? 'text-white border-b-2 border-green-500'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Tags {selectedTags.size > 0 && `(${selectedTags.size})`}
                </button>
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === 'notes'
                      ? 'text-white border-b-2 border-green-500'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Notes {allNotes.length > 0 && `(${allNotes.length})`}
                </button>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'tags' ? <TagsTab /> : <NotesTab />}
              </div>
            </div>
          </div>
        )}

        {/* Selected channels bar */}
        <SelectedChannelsBar />

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 bg-zinc-900/50">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button
              onClick={close}
              disabled={saving}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-500 text-white rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : 'Done'}
            </button>
          </div>
        </div>
      </div>

      {/* Channel popover (positioned relative to clicked group) */}
      {activeGroup && popoverAnchor && (
        <ChannelPopover group={activeGroup} anchorElement={popoverAnchor} onClose={() => setActiveGroupId(null)} />
      )}
    </div>,
    document.body
  )
}

export default ContentEditOverlay
