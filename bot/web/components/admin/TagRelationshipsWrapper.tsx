'use client'

import { useState } from 'react'
import TagRelationshipsView from './TagRelationshipsView'
import TagRelationshipsGraph from './TagRelationshipsGraph'

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

interface TagRelationship {
  id: string
  tag_id_1: string
  tag_id_2: string
  relationship_type: 'related' | 'tool_of' | 'technique_of' | 'part_of'
  strength: number
  created_at: string
  tag1: Tag
  tag2: Tag
}

interface Props {
  tags: Tag[]
  relationships: TagRelationship[]
  onRefresh: () => void
}

export default function TagRelationshipsWrapper({ tags, relationships, onRefresh }: Props) {
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list')

  return (
    <div className="space-y-6">
      {/* View Mode Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">View:</span>
        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            📋 List View
          </button>
          <button
            onClick={() => setViewMode('graph')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'graph'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            🕸️ Graph View
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        <TagRelationshipsView tags={tags} relationships={relationships} onRefresh={onRefresh} />
      ) : (
        <TagRelationshipsGraph tags={tags} relationships={relationships} onRefresh={onRefresh} />
      )}
    </div>
  )
}
