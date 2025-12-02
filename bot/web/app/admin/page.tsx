'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface TagStats {
  totalTags: number
  rootTags: number
  maxDepth: number
  systemTags: number
  customTags: number
  totalPosts: number
  todayPosts: number
}

interface RecentTag {
  id: string
  name: string
  path: string[]
  created_at: string
  depth: number
  icon?: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<TagStats>({
    totalTags: 0,
    rootTags: 0,
    maxDepth: 0,
    systemTags: 0,
    customTags: 0,
    totalPosts: 0,
    todayPosts: 0
  })
  const [recentTags, setRecentTags] = useState<RecentTag[]>([])
  const [loading, setLoading] = useState(true)
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [quickTagName, setQuickTagName] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      // Fetch tags with details
      const { data: tags } = await supabase
        .from('tags')
        .select('*')
        .order('created_at', { ascending: false })

      // Fetch posts
      const { data: posts } = await supabase
        .from('tagged_posts')
        .select('timestamp')

      const today = new Date().toDateString()
      const todayCount = posts?.filter(p => {
        return new Date(p.timestamp).toDateString() === today
      }).length || 0

      const maxDepth = tags && tags.length > 0
        ? Math.max(...tags.map(t => t.depth || 0))
        : 0

      setStats({
        totalTags: tags?.length || 0,
        rootTags: tags?.filter(t => !t.parent_id).length || 0,
        maxDepth,
        systemTags: tags?.filter(t => t.is_system).length || 0,
        customTags: tags?.filter(t => !t.is_system).length || 0,
        totalPosts: posts?.length || 0,
        todayPosts: todayCount
      })

      setRecentTags(tags?.slice(0, 5) || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleQuickCreate() {
    if (!quickTagName.trim()) return

    try {
      const { error } = await supabase
        .from('tags')
        .insert({ name: quickTagName.trim() })

      if (error) throw error

      setQuickTagName('')
      setShowQuickCreate(false)
      fetchData()
    } catch (error) {
      console.error('Error creating tag:', error)
      alert('Error creating tag')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tag Management Dashboard</h1>
          <p className="text-muted-foreground">Hierarchical tagging system for 530</p>
        </div>
        <Button onClick={() => setShowQuickCreate(true)}>
          + Quick Create Tag
        </Button>
      </div>

      {/* Tag Hierarchy Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Total Tags</h3>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
              <path d="M7 7h.01" />
            </svg>
          </div>
          <div className="text-2xl font-bold">{stats.totalTags}</div>
          <p className="text-xs text-muted-foreground">
            {stats.systemTags} system, {stats.customTags} custom
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Root Categories</h3>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M3 3v18h18" />
              <path d="M18 17V9" />
              <path d="M13 17V5" />
              <path d="M8 17v-3" />
            </svg>
          </div>
          <div className="text-2xl font-bold">{stats.rootTags}</div>
          <p className="text-xs text-muted-foreground">
            Top-level categories
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Max Depth</h3>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div className="text-2xl font-bold">{stats.maxDepth}</div>
          <p className="text-xs text-muted-foreground">
            Deepest nesting level
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Tagged Posts</h3>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </div>
          <div className="text-2xl font-bold">{stats.totalPosts}</div>
          <p className="text-xs text-muted-foreground">
            {stats.todayPosts} tagged today
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Tags */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recently Created Tags</h3>
            <Link href="/admin/tags" className="text-sm text-primary hover:underline">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {recentTags.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tags created yet
              </p>
            ) : (
              recentTags.map(tag => (
                <div key={tag.id} className="flex items-center justify-between p-2 hover:bg-accent rounded-md">
                  <div className="flex items-center gap-2">
                    {tag.icon && <span className="text-lg">{tag.icon}</span>}
                    <div>
                      <p className="font-medium text-sm">{tag.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {tag.path.join(' > ')}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Depth: {tag.depth}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Link href="/admin/tags">
              <Button className="w-full" variant="default">
                🏷️ Manage Tag Hierarchy
              </Button>
            </Link>
            <Link href="/admin/tags?filter=root">
              <Button className="w-full" variant="outline">
                📂 View Root Categories
              </Button>
            </Link>
            <Link href="/admin/tags?filter=system">
              <Button className="w-full" variant="outline">
                ⚙️ System Tags
              </Button>
            </Link>
            <Link href="http://127.0.0.1:54323" target="_blank">
              <Button className="w-full" variant="outline">
                🗄️ Open Supabase Studio
              </Button>
            </Link>
            <Link href="/">
              <Button className="w-full" variant="outline">
                🌐 View Public Site
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Create Modal */}
      {showQuickCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md border">
            <h2 className="text-xl font-bold mb-4">Quick Create Tag</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tag Name</label>
                <input
                  type="text"
                  value={quickTagName}
                  onChange={(e) => setQuickTagName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQuickCreate()}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., Machine Learning"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Creates a root-level tag. Use the full editor for nested tags.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowQuickCreate(false)
                  setQuickTagName('')
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleQuickCreate}
                disabled={!quickTagName.trim()}
                className="flex-1"
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
