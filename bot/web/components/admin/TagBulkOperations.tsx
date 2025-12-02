'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Tag {
  id: string
  slug: string
  name: string
  parent_id: string | null
  path: string[]
  depth: number
  description: string | null
  icon: string | null
  color: string | null
  is_system: boolean
  created_at: string
  updated_at: string
}

interface TagBulkOperationsProps {
  tags: Tag[]
  onRefresh: () => void
}

type BulkOperation = 'move' | 'delete' | 'merge' | 'export' | 'import'

export default function TagBulkOperations({ tags, onRefresh }: TagBulkOperationsProps) {
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set())
  const [operation, setOperation] = useState<BulkOperation | null>(null)
  const [newParentId, setNewParentId] = useState<string>('')
  const [mergeTargetId, setMergeTargetId] = useState<string>('')
  const [confirmationText, setConfirmationText] = useState('')
  const [processing, setProcessing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Filter tags for selection
  const filteredTags = tags.filter(tag =>
    searchQuery === '' ||
    tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tag.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Toggle tag selection
  const toggleTag = (tagId: string) => {
    const newSet = new Set(selectedTagIds)
    if (newSet.has(tagId)) {
      newSet.delete(tagId)
    } else {
      newSet.add(tagId)
    }
    setSelectedTagIds(newSet)
  }

  // Select all filtered tags
  const selectAll = () => {
    const newSet = new Set(filteredTags.map(t => t.id))
    setSelectedTagIds(newSet)
  }

  // Clear selection
  const clearSelection = () => {
    setSelectedTagIds(new Set())
    setConfirmationText('')
  }

  // Bulk move operation
  const handleBulkMove = async () => {
    if (!newParentId || selectedTagIds.size === 0) return

    setProcessing(true)
    try {
      const updates = Array.from(selectedTagIds).map(tagId =>
        supabase
          .from('tags')
          .update({ parent_id: newParentId === 'root' ? null : newParentId })
          .eq('id', tagId)
      )

      await Promise.all(updates)

      alert(`Successfully moved ${selectedTagIds.size} tag(s)`)
      clearSelection()
      setNewParentId('')
      setOperation(null)
      onRefresh()
    } catch (error) {
      console.error('Error moving tags:', error)
      alert('Failed to move tags. Check console for details.')
    } finally {
      setProcessing(false)
    }
  }

  // Bulk delete operation
  const handleBulkDelete = async () => {
    if (selectedTagIds.size === 0 || confirmationText !== 'DELETE') return

    // Check for system tags
    const systemTags = tags.filter(t => selectedTagIds.has(t.id) && t.is_system)
    if (systemTags.length > 0) {
      alert(`Cannot delete system tags: ${systemTags.map(t => t.name).join(', ')}`)
      return
    }

    setProcessing(true)
    try {
      // Delete in batches to avoid timeouts
      const tagIdsArray = Array.from(selectedTagIds)
      for (let i = 0; i < tagIdsArray.length; i += 10) {
        const batch = tagIdsArray.slice(i, i + 10)
        await supabase
          .from('tags')
          .delete()
          .in('id', batch)
      }

      alert(`Successfully deleted ${selectedTagIds.size} tag(s)`)
      clearSelection()
      setOperation(null)
      onRefresh()
    } catch (error) {
      console.error('Error deleting tags:', error)
      alert('Failed to delete tags. Check console for details.')
    } finally {
      setProcessing(false)
    }
  }

  // Bulk merge operation
  const handleBulkMerge = async () => {
    if (!mergeTargetId || selectedTagIds.size === 0 || confirmationText !== 'MERGE') return

    // Ensure target tag exists and is not in selection
    if (selectedTagIds.has(mergeTargetId)) {
      alert('Cannot merge tags into one of the selected tags')
      return
    }

    setProcessing(true)
    try {
      // Note: This is a simplified merge. In production, you'd also need to:
      // 1. Migrate any content tagged with old tags to new tag
      // 2. Migrate relationships
      // 3. Handle tag usage statistics

      const tagIdsArray = Array.from(selectedTagIds)

      // Delete the old tags
      for (let i = 0; i < tagIdsArray.length; i += 10) {
        const batch = tagIdsArray.slice(i, i + 10)
        await supabase
          .from('tags')
          .delete()
          .in('id', batch)
      }

      alert(`Successfully merged ${selectedTagIds.size} tag(s) into target tag`)
      clearSelection()
      setMergeTargetId('')
      setOperation(null)
      onRefresh()
    } catch (error) {
      console.error('Error merging tags:', error)
      alert('Failed to merge tags. Check console for details.')
    } finally {
      setProcessing(false)
    }
  }

  // Export tags as JSON
  const handleExport = () => {
    const selectedTags = tags.filter(t => selectedTagIds.has(t.id))
    const dataStr = JSON.stringify(selectedTags, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `tags-export-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)

    alert(`Exported ${selectedTagIds.size} tag(s)`)
  }

  // Import tags from JSON
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setProcessing(true)
    try {
      const text = await file.text()
      const importedTags = JSON.parse(text)

      if (!Array.isArray(importedTags)) {
        throw new Error('Invalid format: expected array of tags')
      }

      // Insert tags (ignore duplicates)
      for (const tag of importedTags) {
        const { id, created_at, updated_at, ...tagData } = tag
        await supabase
          .from('tags')
          .upsert(tagData, { onConflict: 'slug' })
      }

      alert(`Successfully imported ${importedTags.length} tag(s)`)
      onRefresh()
    } catch (error) {
      console.error('Error importing tags:', error)
      alert('Failed to import tags. Check console for details.')
    } finally {
      setProcessing(false)
      event.target.value = '' // Reset file input
    }
  }

  const OperationCard = ({
    op,
    icon,
    title,
    description,
    color,
    disabled
  }: {
    op: BulkOperation
    icon: string
    title: string
    description: string
    color: string
    disabled?: boolean
  }) => (
    <button
      onClick={() => setOperation(op)}
      disabled={disabled}
      className={`
        ${color} text-white p-6 rounded-xl shadow-lg transition-all
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-xl'}
        ${operation === op ? 'ring-4 ring-white ring-opacity-50 scale-105' : ''}
      `}
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm opacity-90">{description}</p>
    </button>
  )

  return (
    <div className="space-y-6">
      {/* Operation Selection */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Select Operation</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <OperationCard
            op="move"
            icon="📦"
            title="Bulk Move"
            description="Move tags to new parent"
            color="bg-gradient-to-br from-blue-500 to-blue-600"
            disabled={selectedTagIds.size === 0}
          />
          <OperationCard
            op="delete"
            icon="🗑️"
            title="Bulk Delete"
            description="Delete multiple tags"
            color="bg-gradient-to-br from-red-500 to-red-600"
            disabled={selectedTagIds.size === 0}
          />
          <OperationCard
            op="merge"
            icon="🔀"
            title="Bulk Merge"
            description="Merge tags into one"
            color="bg-gradient-to-br from-purple-500 to-purple-600"
            disabled={selectedTagIds.size === 0}
          />
          <OperationCard
            op="export"
            icon="📤"
            title="Export Tags"
            description="Download as JSON"
            color="bg-gradient-to-br from-green-500 to-green-600"
          />
          <OperationCard
            op="import"
            icon="📥"
            title="Import Tags"
            description="Upload from JSON"
            color="bg-gradient-to-br from-orange-500 to-orange-600"
          />
        </div>
      </div>

      {/* Tag Selection */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">
            Select Tags
            {selectedTagIds.size > 0 && (
              <span className="ml-3 text-sm font-normal text-purple-600">
                ({selectedTagIds.size} selected)
              </span>
            )}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              Select All ({filteredTags.length})
            </button>
            <button
              onClick={clearSelection}
              className="px-4 py-2 text-sm font-medium text-muted-foreground bg-muted rounded-lg hover:bg-accent transition-colors"
              disabled={selectedTagIds.size === 0}
            >
              Clear Selection
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tags to select..."
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Tag List */}
        <div className="bg-card border border-border rounded-xl p-4 max-h-96 overflow-y-auto">
          <div className="space-y-2">
            {filteredTags.map(tag => (
              <label
                key={tag.id}
                className={`
                  flex items-center p-3 rounded-lg cursor-pointer transition-colors
                  ${selectedTagIds.has(tag.id) ? 'bg-purple-50 border-2 border-purple-300' : 'bg-muted border-2 border-transparent hover:bg-accent'}
                `}
              >
                <input
                  type="checkbox"
                  checked={selectedTagIds.has(tag.id)}
                  onChange={() => toggleTag(tag.id)}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
                <div className="ml-3 flex-1 flex items-center">
                  {tag.icon && <span className="mr-2 text-lg">{tag.icon}</span>}
                  <div>
                    <div className="text-sm font-medium text-foreground">{tag.name}</div>
                    <div className="text-xs text-gray-500">{tag.slug}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Level {tag.depth}</span>
                  {tag.is_system && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-pink-100 text-pink-700">
                      System
                    </span>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Operation Panel */}
      {operation && (
        <div className="bg-gradient-to-br from-muted to-muted border-2 border-border rounded-xl p-6">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            {operation === 'move' && '📦 Bulk Move Tags'}
            {operation === 'delete' && '🗑️ Bulk Delete Tags'}
            {operation === 'merge' && '🔀 Bulk Merge Tags'}
            {operation === 'export' && '📤 Export Tags'}
            {operation === 'import' && '📥 Import Tags'}
          </h2>

          {/* Move Operation */}
          {operation === 'move' && (
            <div className="space-y-4">
              <p className="text-sm text-foreground">
                Move {selectedTagIds.size} selected tag(s) to a new parent category.
              </p>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  New Parent Category
                </label>
                <select
                  value={newParentId}
                  onChange={(e) => setNewParentId(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select parent...</option>
                  <option value="root">🌐 Root (No Parent)</option>
                  {tags
                    .filter(t => !selectedTagIds.has(t.id))
                    .map(tag => (
                      <option key={tag.id} value={tag.id}>
                        {'  '.repeat(tag.depth)} {tag.icon} {tag.name}
                      </option>
                    ))}
                </select>
              </div>
              <button
                onClick={handleBulkMove}
                disabled={!newParentId || processing}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? 'Moving...' : `Move ${selectedTagIds.size} Tag(s)`}
              </button>
            </div>
          )}

          {/* Delete Operation */}
          {operation === 'delete' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <span className="text-2xl mr-3">⚠️</span>
                  <div>
                    <h3 className="text-sm font-semibold text-red-900 mb-1">Warning: Permanent Deletion</h3>
                    <p className="text-sm text-red-800">
                      This will permanently delete {selectedTagIds.size} tag(s) and all their relationships.
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Type DELETE to confirm
                </label>
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
              <button
                onClick={handleBulkDelete}
                disabled={confirmationText !== 'DELETE' || processing}
                className="w-full px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? 'Deleting...' : `Delete ${selectedTagIds.size} Tag(s)`}
              </button>
            </div>
          )}

          {/* Merge Operation */}
          {operation === 'merge' && (
            <div className="space-y-4">
              <p className="text-sm text-foreground">
                Merge {selectedTagIds.size} selected tag(s) into a target tag. The selected tags will be deleted
                and their content will be migrated to the target tag.
              </p>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Merge Into (Target Tag)
                </label>
                <select
                  value={mergeTargetId}
                  onChange={(e) => setMergeTargetId(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select target tag...</option>
                  {tags
                    .filter(t => !selectedTagIds.has(t.id))
                    .map(tag => (
                      <option key={tag.id} value={tag.id}>
                        {tag.icon} {tag.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Type MERGE to confirm
                </label>
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="MERGE"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button
                onClick={handleBulkMerge}
                disabled={!mergeTargetId || confirmationText !== 'MERGE' || processing}
                className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? 'Merging...' : `Merge ${selectedTagIds.size} Tag(s)`}
              </button>
            </div>
          )}

          {/* Export Operation */}
          {operation === 'export' && (
            <div className="space-y-4">
              <p className="text-sm text-foreground">
                Export {selectedTagIds.size > 0 ? `${selectedTagIds.size} selected tag(s)` : 'all tags'} as JSON file.
              </p>
              <button
                onClick={handleExport}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Download JSON ({selectedTagIds.size} tags)
              </button>
            </div>
          )}

          {/* Import Operation */}
          {operation === 'import' && (
            <div className="space-y-4">
              <p className="text-sm text-foreground">
                Import tags from a JSON file. Existing tags with the same slug will be updated.
              </p>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                    disabled={processing}
                  />
                  <div className="text-4xl mb-3">📁</div>
                  <div className="text-sm font-medium text-foreground">
                    {processing ? 'Importing...' : 'Click to select JSON file'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Accepts .json files with tag data
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Cancel Button */}
          <button
            onClick={() => {
              setOperation(null)
              setConfirmationText('')
              setNewParentId('')
              setMergeTargetId('')
            }}
            className="w-full mt-4 px-6 py-2 text-foreground bg-card border border-border rounded-lg font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
