'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import TagHierarchyView from '@/components/admin/TagHierarchyView'
import TagRelationshipsWrapper from '@/components/admin/TagRelationshipsWrapper'
import TagStatisticsView from '@/components/admin/TagStatisticsView'
import TagBulkOperations from '@/components/admin/TagBulkOperations'
import TagHierarchyJSON from '@/components/admin/TagHierarchyJSON'
import TagDescriptionUpdater from '@/components/admin/TagDescriptionUpdater'

type TabType = 'hierarchy' | 'relationships' | 'statistics' | 'bulk' | 'json' | 'descriptions'

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

export default function TagsAdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('hierarchy')
  const [tags, setTags] = useState<Tag[]>([])
  const [relationships, setRelationships] = useState<TagRelationship[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      await Promise.all([
        fetchTags(),
        fetchRelationships()
      ])
    } finally {
      setLoading(false)
    }
  }

  async function fetchTags() {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('path')

      if (error) throw error
      setTags(data || [])
    } catch (error) {
      console.error('Error fetching tags:', error)
    }
  }

  async function fetchRelationships() {
    try {
      const { data, error } = await supabase
        .from('tag_relationships')
        .select(`
          *,
          tag1:tags!tag_relationships_tag_id_1_fkey(*),
          tag2:tags!tag_relationships_tag_id_2_fkey(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRelationships(data || [])
    } catch (error) {
      console.error('Error fetching relationships:', error)
    }
  }

  const tabs = [
    { id: 'hierarchy' as TabType, label: 'Tag Hierarchy', icon: '🏗️', count: tags.length },
    { id: 'relationships' as TabType, label: 'Relationships', icon: '🔗', count: relationships.length },
    { id: 'statistics' as TabType, label: 'Statistics', icon: '📊', count: null },
    { id: 'bulk' as TabType, label: 'Bulk Operations', icon: '⚡', count: null },
    { id: 'descriptions' as TabType, label: 'Update Descriptions', icon: '📝', count: null },
    { id: 'json' as TabType, label: 'JSON Export', icon: '📋', count: null }
  ]

  const filteredTags = tags.filter(tag =>
    searchQuery === '' ||
    tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tag.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tag.description && tag.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500"></div>
          <p className="text-muted-foreground">Loading tag management system...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
              Tag Management System
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage hierarchical tags, relationships, and analytics
            </p>
          </div>

          {/* Global Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tags..."
              className="pl-10 pr-4 py-2 w-64 bg-card border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder:text-muted-foreground"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground"
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
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
          <div className="text-3xl font-bold">{tags.length}</div>
          <div className="text-purple-100 text-sm mt-1">Total Tags</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
          <div className="text-3xl font-bold">{tags.filter(t => !t.parent_id).length}</div>
          <div className="text-blue-100 text-sm mt-1">Root Categories</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
          <div className="text-3xl font-bold">{Math.max(...tags.map(t => t.depth), 0)}</div>
          <div className="text-green-100 text-sm mt-1">Max Depth</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg">
          <div className="text-3xl font-bold">{relationships.length}</div>
          <div className="text-orange-100 text-sm mt-1">Relationships</div>
        </div>
        <div className="bg-gradient-to-br from-pink-500 to-pink-600 text-white p-6 rounded-xl shadow-lg">
          <div className="text-3xl font-bold">{tags.filter(t => t.is_system).length}</div>
          <div className="text-pink-100 text-sm mt-1">System Tags</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
              {tab.count !== null && (
                <span className={`
                  ml-2 px-2 py-0.5 rounded-full text-xs
                  ${activeTab === tab.id
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                  }
                `}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        {activeTab === 'hierarchy' && (
          <TagHierarchyView
            tags={searchQuery ? filteredTags : tags}
            onRefresh={fetchTags}
            searchQuery={searchQuery}
          />
        )}

        {activeTab === 'relationships' && (
          <TagRelationshipsWrapper
            tags={tags}
            relationships={relationships}
            onRefresh={fetchRelationships}
          />
        )}

        {activeTab === 'statistics' && (
          <TagStatisticsView
            tags={tags}
            relationships={relationships}
          />
        )}

        {activeTab === 'bulk' && (
          <TagBulkOperations
            tags={tags}
            onRefresh={fetchTags}
          />
        )}

        {activeTab === 'descriptions' && (
          <TagDescriptionUpdater
            tags={tags}
            onRefresh={fetchTags}
          />
        )}

        {activeTab === 'json' && (
          <TagHierarchyJSON
            tags={tags}
          />
        )}
      </div>
    </div>
  )
}
