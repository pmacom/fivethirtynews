'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
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

interface TagRelationshipsGraphProps {
  tags: Tag[]
  relationships: TagRelationship[]
  onRefresh: () => void
}

interface Node {
  id: string
  tag: Tag
  x: number
  y: number
  vx: number
  vy: number
  connections: number
}

const RELATIONSHIP_COLORS = {
  related: '#3b82f6',
  tool_of: '#10b981',
  technique_of: '#a855f7',
  part_of: '#f59e0b'
}

export default function TagRelationshipsGraph({ tags, relationships, onRefresh }: TagRelationshipsGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [hoveredTag, setHoveredTag] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'force' | 'circular'>('force')
  const [showLabels, setShowLabels] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [nodes, setNodes] = useState<Node[]>([])
  const [animationFrame, setAnimationFrame] = useState(0)

  // Get tags that have relationships
  const connectedTags = useMemo(() => {
    const tagIds = new Set<string>()
    relationships.forEach(rel => {
      tagIds.add(rel.tag_id_1)
      tagIds.add(rel.tag_id_2)
    })
    return tags.filter(tag => tagIds.has(tag.id))
  }, [tags, relationships])

  // Filter relationships
  const filteredRelationships = useMemo(() => {
    if (filterType === 'all') return relationships
    return relationships.filter(rel => rel.relationship_type === filterType)
  }, [relationships, filterType])

  // Initialize nodes
  useEffect(() => {
    const width = 800
    const height = 600
    const centerX = width / 2
    const centerY = height / 2

    const connectionCounts = new Map<string, number>()
    filteredRelationships.forEach(rel => {
      connectionCounts.set(rel.tag_id_1, (connectionCounts.get(rel.tag_id_1) || 0) + 1)
      connectionCounts.set(rel.tag_id_2, (connectionCounts.get(rel.tag_id_2) || 0) + 1)
    })

    const newNodes: Node[] = connectedTags.map((tag, i) => {
      if (viewMode === 'circular') {
        const angle = (i / connectedTags.length) * Math.PI * 2
        const radius = Math.min(width, height) * 0.35
        return {
          id: tag.id,
          tag,
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
          vx: 0,
          vy: 0,
          connections: connectionCounts.get(tag.id) || 0
        }
      } else {
        return {
          id: tag.id,
          tag,
          x: centerX + (Math.random() - 0.5) * width * 0.6,
          y: centerY + (Math.random() - 0.5) * height * 0.6,
          vx: 0,
          vy: 0,
          connections: connectionCounts.get(tag.id) || 0
        }
      }
    })

    setNodes(newNodes)
  }, [connectedTags, viewMode, filteredRelationships])

  // Physics simulation for force-directed layout
  useEffect(() => {
    if (viewMode !== 'force' || nodes.length === 0) return

    let animationId: number
    const simulate = () => {
      setNodes(prevNodes => {
        const newNodes = [...prevNodes]
        const width = 800
        const height = 600

        // Apply forces
        newNodes.forEach(node => {
          // Center gravity
          const dx = width / 2 - node.x
          const dy = height / 2 - node.y
          node.vx += dx * 0.0001
          node.vy += dy * 0.0001

          // Repulsion from other nodes
          newNodes.forEach(other => {
            if (node.id === other.id) return
            const dx = node.x - other.x
            const dy = node.y - other.y
            const dist = Math.sqrt(dx * dx + dy * dy) + 1
            const force = 5000 / (dist * dist)
            node.vx += (dx / dist) * force
            node.vy += (dy / dist) * force
          })
        })

        // Apply link forces
        filteredRelationships.forEach(rel => {
          const node1 = newNodes.find(n => n.id === rel.tag_id_1)
          const node2 = newNodes.find(n => n.id === rel.tag_id_2)
          if (!node1 || !node2) return

          const dx = node2.x - node1.x
          const dy = node2.y - node1.y
          const dist = Math.sqrt(dx * dx + dy * dy) + 1
          const targetDist = 150
          const force = (dist - targetDist) * 0.05 * rel.strength

          node1.vx += (dx / dist) * force
          node1.vy += (dy / dist) * force
          node2.vx -= (dx / dist) * force
          node2.vy -= (dy / dist) * force
        })

        // Update positions with damping
        newNodes.forEach(node => {
          node.vx *= 0.85
          node.vy *= 0.85
          node.x += node.vx
          node.y += node.vy

          // Keep in bounds
          node.x = Math.max(50, Math.min(width - 50, node.x))
          node.y = Math.max(50, Math.min(height - 50, node.y))
        })

        return newNodes
      })

      animationId = requestAnimationFrame(simulate)
    }

    simulate()
    return () => cancelAnimationFrame(animationId)
  }, [viewMode, filteredRelationships])

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || nodes.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw relationships
    filteredRelationships.forEach(rel => {
      const node1 = nodes.find(n => n.id === rel.tag_id_1)
      const node2 = nodes.find(n => n.id === rel.tag_id_2)
      if (!node1 || !node2) return

      const isHighlighted = selectedTag === rel.tag_id_1 || selectedTag === rel.tag_id_2

      ctx.beginPath()
      ctx.moveTo(node1.x, node1.y)
      ctx.lineTo(node2.x, node2.y)
      ctx.strokeStyle = isHighlighted
        ? RELATIONSHIP_COLORS[rel.relationship_type]
        : `${RELATIONSHIP_COLORS[rel.relationship_type]}40`
      ctx.lineWidth = isHighlighted ? 3 : 1 + rel.strength * 2
      ctx.stroke()

      // Draw arrow
      if (isHighlighted) {
        const angle = Math.atan2(node2.y - node1.y, node2.x - node1.x)
        const arrowSize = 8
        const midX = (node1.x + node2.x) / 2
        const midY = (node1.y + node2.y) / 2

        ctx.beginPath()
        ctx.moveTo(midX, midY)
        ctx.lineTo(
          midX - arrowSize * Math.cos(angle - Math.PI / 6),
          midY - arrowSize * Math.sin(angle - Math.PI / 6)
        )
        ctx.lineTo(
          midX - arrowSize * Math.cos(angle + Math.PI / 6),
          midY - arrowSize * Math.sin(angle + Math.PI / 6)
        )
        ctx.closePath()
        ctx.fillStyle = RELATIONSHIP_COLORS[rel.relationship_type]
        ctx.fill()
      }
    })

    // Draw nodes
    nodes.forEach(node => {
      const isSelected = selectedTag === node.id
      const isHovered = hoveredTag === node.id
      const radius = 8 + node.connections * 2

      // Node circle
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
      ctx.fillStyle = isSelected || isHovered ? '#a855f7' : '#6b7280'
      ctx.fill()

      if (isSelected || isHovered) {
        ctx.strokeStyle = '#c084fc'
        ctx.lineWidth = 3
        ctx.stroke()
      }

      // Label
      if (showLabels && (isSelected || isHovered || node.connections > 3)) {
        ctx.fillStyle = '#ffffff'
        ctx.font = '12px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(
          node.tag.icon ? `${node.tag.icon} ${node.tag.name}` : node.tag.name,
          node.x,
          node.y - radius - 5
        )
      }
    })
  }, [nodes, filteredRelationships, selectedTag, hoveredTag, showLabels])

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Find clicked node
    for (const node of nodes) {
      const radius = 8 + node.connections * 2
      const dist = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2)
      if (dist <= radius) {
        setSelectedTag(selectedTag === node.id ? null : node.id)
        return
      }
    }

    setSelectedTag(null)
  }

  // Handle canvas hover
  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    for (const node of nodes) {
      const radius = 8 + node.connections * 2
      const dist = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2)
      if (dist <= radius) {
        setHoveredTag(node.id)
        return
      }
    }

    setHoveredTag(null)
  }

  const selectedTagData = selectedTag ? tags.find(t => t.id === selectedTag) : null
  const selectedRelationships = selectedTag
    ? filteredRelationships.filter(r => r.tag_id_1 === selectedTag || r.tag_id_2 === selectedTag)
    : []

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Layout:</span>
            <div className="flex bg-muted rounded-lg p-1">
              <button
                onClick={() => setViewMode('force')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'force' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Force
              </button>
              <button
                onClick={() => setViewMode('circular')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'circular' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Circular
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Filter:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 bg-card border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Types</option>
              <option value="related">Related</option>
              <option value="tool_of">Tool Of</option>
              <option value="technique_of">Technique Of</option>
              <option value="part_of">Part Of</option>
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              className="w-4 h-4 text-primary rounded focus:ring-primary"
            />
            <span className="text-sm font-medium text-muted-foreground">Show Labels</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          {Object.entries(RELATIONSHIP_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-muted-foreground capitalize">{type.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Graph Canvas */}
      <div className="relative bg-card border border-border rounded-xl overflow-hidden">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMove}
          className="cursor-pointer"
        />
      </div>

      {/* Selected Tag Info */}
      {selectedTagData && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {selectedTagData.icon && <span className="text-3xl">{selectedTagData.icon}</span>}
              <div>
                <h3 className="text-xl font-bold text-foreground">{selectedTagData.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedTagData.slug}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedTag(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>

          {selectedTagData.description && (
            <p className="text-sm text-muted-foreground mb-4">{selectedTagData.description}</p>
          )}

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Relationships ({selectedRelationships.length})
            </h4>
            <div className="space-y-2">
              {selectedRelationships.map(rel => {
                const otherTag = rel.tag_id_1 === selectedTag ? rel.tag2 : rel.tag1
                const direction = rel.tag_id_1 === selectedTag ? '→' : '←'

                return (
                  <div
                    key={rel.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: RELATIONSHIP_COLORS[rel.relationship_type] }}
                      />
                      <span className="text-sm font-medium text-foreground">
                        {direction} {otherTag.icon} {otherTag.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground capitalize">
                        {rel.relationship_type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {(rel.strength * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {connectedTags.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No tag relationships to display</p>
        </div>
      )}
    </div>
  )
}
