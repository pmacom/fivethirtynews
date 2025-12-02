'use client'

import { useMemo, useState } from 'react'

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

interface TagHierarchyJSONProps {
  tags: Tag[]
}

interface TagNode {
  id: string
  slug: string
  name: string
  icon: string | null
  color: string | null
  description: string | null
  depth: number
  is_system: boolean
  children?: TagNode[]
}

export default function TagHierarchyJSON({ tags }: TagHierarchyJSONProps) {
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree')
  const [includeMetadata, setIncludeMetadata] = useState(false)
  const [copied, setCopied] = useState(false)

  // Build hierarchical tree structure
  const hierarchyTree = useMemo(() => {
    const tagMap = new Map<string, TagNode>()
    const rootNodes: TagNode[] = []

    // Create nodes
    tags.forEach(tag => {
      const node: TagNode = {
        id: tag.id,
        slug: tag.slug,
        name: tag.name,
        icon: tag.icon,
        color: tag.color,
        description: tag.description,
        depth: tag.depth,
        is_system: tag.is_system,
        children: []
      }
      tagMap.set(tag.id, node)
    })

    // Build tree
    tags.forEach(tag => {
      const node = tagMap.get(tag.id)!
      if (tag.parent_id) {
        const parent = tagMap.get(tag.parent_id)
        if (parent) {
          parent.children!.push(node)
        }
      } else {
        rootNodes.push(node)
      }
    })

    // Sort children by name
    const sortChildren = (nodes: TagNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name))
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          sortChildren(node.children)
        }
      })
    }
    sortChildren(rootNodes)

    return rootNodes
  }, [tags])

  // Get flat list sorted by path
  const flatList = useMemo(() => {
    return tags
      .sort((a, b) => a.path.join('/').localeCompare(b.path.join('/')))
      .map(tag => ({
        id: tag.id,
        slug: tag.slug,
        name: tag.name,
        parent_id: tag.parent_id,
        path: tag.path,
        icon: tag.icon,
        color: tag.color,
        description: tag.description,
        depth: tag.depth,
        is_system: tag.is_system,
        ...(includeMetadata && {
          created_at: tag.created_at,
          updated_at: tag.updated_at
        })
      }))
  }, [tags, includeMetadata])

  // Clean tree for minimal view (remove empty children arrays)
  const cleanTree = (nodes: TagNode[]): any[] => {
    return nodes.map(node => {
      const cleaned: any = {
        slug: node.slug,
        name: node.name,
        ...(node.icon && { icon: node.icon }),
        ...(node.color && { color: node.color }),
        ...(node.description && { description: node.description }),
        ...(includeMetadata && {
          id: node.id,
          depth: node.depth,
          is_system: node.is_system
        })
      }

      if (node.children && node.children.length > 0) {
        cleaned.children = cleanTree(node.children)
      }

      return cleaned
    })
  }

  const jsonData = viewMode === 'tree' ? cleanTree(hierarchyTree) : flatList
  const jsonString = JSON.stringify(jsonData, null, 2)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadJSON = () => {
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `tag-hierarchy-${viewMode}-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Calculate statistics
  const stats = useMemo(() => {
    const totalTags = tags.length
    const rootTags = tags.filter(t => !t.parent_id).length
    const maxDepth = Math.max(...tags.map(t => t.depth), 0)
    const jsonSize = new Blob([jsonString]).size
    const formattedSize = jsonSize > 1024
      ? `${(jsonSize / 1024).toFixed(2)} KB`
      : `${jsonSize} bytes`

    return { totalTags, rootTags, maxDepth, jsonSize: formattedSize }
  }, [tags, jsonString])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Tag Hierarchy JSON Export</h2>
        <p className="text-muted-foreground">
          View and export your tag hierarchy as JSON in tree or flat format
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold">{stats.totalTags}</div>
          <div className="text-sm opacity-90">Total Tags</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold">{stats.rootTags}</div>
          <div className="text-sm opacity-90">Root Categories</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold">{stats.maxDepth}</div>
          <div className="text-sm opacity-90">Max Depth</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold">{stats.jsonSize}</div>
          <div className="text-sm opacity-90">JSON Size</div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">View Mode:</span>
              <div className="flex bg-muted rounded-lg p-1">
                <button
                  onClick={() => setViewMode('tree')}
                  className={`
                    px-4 py-2 rounded-md text-sm font-medium transition-colors
                    ${viewMode === 'tree'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  🌳 Tree
                </button>
                <button
                  onClick={() => setViewMode('flat')}
                  className={`
                    px-4 py-2 rounded-md text-sm font-medium transition-colors
                    ${viewMode === 'flat'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  📄 Flat
                </button>
              </div>
            </div>

            {/* Include Metadata Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-foreground">Include Metadata</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              {copied ? (
                <>
                  <span>✓</span>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <span>📋</span>
                  <span>Copy JSON</span>
                </>
              )}
            </button>
            <button
              onClick={downloadJSON}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              <span>💾</span>
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* Format Description */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">
                {viewMode === 'tree' ? 'Tree Format' : 'Flat Format'}
              </h3>
              <p className="text-sm text-blue-800">
                {viewMode === 'tree' ? (
                  <>
                    Hierarchical structure with nested children. Each tag contains its children as an array.
                    Best for understanding parent-child relationships and visualizing the taxonomy structure.
                  </>
                ) : (
                  <>
                    Flat array of all tags sorted by path. Each tag includes parent_id and path information.
                    Best for importing into databases or processing programmatically.
                  </>
                )}
              </p>
              {includeMetadata && (
                <p className="text-sm text-blue-700 mt-2">
                  ✓ Including metadata: IDs, timestamps, depth, and system flags
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* JSON Display */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
          <span className="text-muted-foreground text-sm font-mono">
            {viewMode === 'tree' ? 'hierarchy-tree.json' : 'hierarchy-flat.json'}
          </span>
          <span className="text-gray-400 text-xs">
            {jsonString.split('\n').length} lines
          </span>
        </div>
        <div className="relative">
          <pre className="bg-gray-900 text-foreground p-6 overflow-x-auto max-h-[600px] overflow-y-auto">
            <code className="text-sm font-mono">{jsonString}</code>
          </pre>
        </div>
      </div>

      {/* Usage Examples */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground mb-4">Usage Examples</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Import in JavaScript/TypeScript</h4>
            <pre className="bg-muted border border-border rounded-lg p-3 text-sm font-mono overflow-x-auto">
{`import hierarchy from './tag-hierarchy.json';

// Access all tags
const allTags = hierarchy;

// Find a specific tag by slug
const tag = hierarchy.find(t => t.slug === 'programming');`}
            </pre>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Process with jq (command line)</h4>
            <pre className="bg-muted border border-border rounded-lg p-3 text-sm font-mono overflow-x-auto">
{`# Get all tag names
cat hierarchy.json | jq '.[].name'

# Count total tags${viewMode === 'tree' ? ' (recursive)' : ''}
cat hierarchy.json | jq '${viewMode === 'tree' ? '[.. | .slug? | select(. != null)] | length' : 'length'}'`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
