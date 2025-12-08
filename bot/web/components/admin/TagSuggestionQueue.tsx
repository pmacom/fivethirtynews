'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, X, Edit2, Loader2, ThumbsUp, ThumbsDown, ChevronDown, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Tag {
  id: string
  name: string
  slug: string
}

interface Suggestion {
  id: string
  tag1: Tag
  tag2: Tag
  suggestedType: 'related' | 'tool_of' | 'technique_of' | 'part_of'
  suggestedStrength: number
  suggestedBy: { id: string; email?: string } | null
  suggestionReason: string | null
  agreeCount: number
  disagreeCount: number
  netVotes: number
  status: 'pending' | 'approved' | 'rejected' | 'merged'
  createdAt: string
}

const RELATIONSHIP_TYPES = [
  { value: 'related', label: 'Related', icon: '↔️', color: 'bg-blue-500/10 text-blue-400' },
  { value: 'tool_of', label: 'Tool Of', icon: '🔧', color: 'bg-green-500/10 text-green-400' },
  { value: 'technique_of', label: 'Technique Of', icon: '⚡', color: 'bg-purple-500/10 text-purple-400' },
  { value: 'part_of', label: 'Part Of', icon: '🧩', color: 'bg-orange-500/10 text-orange-400' },
] as const

export default function TagSuggestionQueue() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)

  // Edit modal state
  const [editingSuggestion, setEditingSuggestion] = useState<Suggestion | null>(null)
  const [editStrength, setEditStrength] = useState(0.7)
  const [editType, setEditType] = useState<string>('related')
  const [editNotes, setEditNotes] = useState('')

  // Pagination
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const limit = 20

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(
        `/api/tags/relationships/suggest?status=${statusFilter}&limit=${limit}&offset=${offset}&sortBy=votes`
      )
      const data = await res.json()
      if (data.success) {
        setSuggestions(data.data)
        setTotal(data.meta?.total || 0)
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, offset])

  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(suggestions.map(s => s.id)))
    } else {
      setSelected(new Set())
    }
  }

  const handleSelect = (id: string, checked: boolean) => {
    const newSelected = new Set(selected)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelected(newSelected)
  }

  const handleApprove = async (suggestion: Suggestion, strength?: number, type?: string, notes?: string) => {
    setIsProcessing(true)
    try {
      const res = await fetch('/api/tags/relationships/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionId: suggestion.id,
          action: strength !== undefined || type !== undefined ? 'modify' : 'approve',
          strength,
          relationshipType: type,
          notes,
        }),
      })
      const data = await res.json()
      if (data.success) {
        fetchSuggestions()
        setEditingSuggestion(null)
      } else {
        alert(data.error || 'Failed to approve')
      }
    } catch (error) {
      console.error('Error approving:', error)
      alert('Error approving suggestion')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async (suggestion: Suggestion, notes?: string) => {
    setIsProcessing(true)
    try {
      const res = await fetch('/api/tags/relationships/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionId: suggestion.id,
          action: 'reject',
          notes,
        }),
      })
      const data = await res.json()
      if (data.success) {
        fetchSuggestions()
      } else {
        alert(data.error || 'Failed to reject')
      }
    } catch (error) {
      console.error('Error rejecting:', error)
      alert('Error rejecting suggestion')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBatchAction = async (action: 'approve' | 'reject') => {
    if (selected.size === 0) return

    const confirmed = confirm(
      `Are you sure you want to ${action} ${selected.size} suggestion(s)?`
    )
    if (!confirmed) return

    setIsProcessing(true)
    try {
      const res = await fetch('/api/tags/relationships/approve', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionIds: Array.from(selected),
          action,
          notes: `Batch ${action}`,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSelected(new Set())
        fetchSuggestions()
        alert(`Processed ${data.data.succeeded}/${data.data.processed} suggestions`)
      } else {
        alert(data.error || 'Batch action failed')
      }
    } catch (error) {
      console.error('Batch action error:', error)
      alert('Error processing batch action')
    } finally {
      setIsProcessing(false)
    }
  }

  const openEditModal = (suggestion: Suggestion) => {
    setEditingSuggestion(suggestion)
    setEditStrength(suggestion.suggestedStrength)
    setEditType(suggestion.suggestedType)
    setEditNotes('')
  }

  const getTypeInfo = (type: string) => {
    return RELATIONSHIP_TYPES.find(t => t.value === type) || RELATIONSHIP_TYPES[0]
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Suggestion Queue</h2>
          <Badge variant="secondary">{total} total</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setOffset(0) }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="merged">Merged</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={fetchSuggestions} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Batch Actions */}
      {selected.size > 0 && statusFilter === 'pending' && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <span className="text-sm">{selected.size} selected</span>
          <Button
            size="sm"
            onClick={() => handleBatchAction('approve')}
            disabled={isProcessing}
          >
            <Check className="h-4 w-4 mr-1" />
            Approve All
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleBatchAction('reject')}
            disabled={isProcessing}
          >
            <X className="h-4 w-4 mr-1" />
            Reject All
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {statusFilter === 'pending' && (
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={selected.size === suggestions.length && suggestions.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              <TableHead>Relationship</TableHead>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead className="w-[80px]">Strength</TableHead>
              <TableHead className="w-[100px]">Community</TableHead>
              <TableHead className="w-[150px]">Source</TableHead>
              {statusFilter === 'pending' && (
                <TableHead className="w-[140px] text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={statusFilter === 'pending' ? 7 : 6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : suggestions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={statusFilter === 'pending' ? 7 : 6} className="text-center py-8 text-muted-foreground">
                  No suggestions found
                </TableCell>
              </TableRow>
            ) : (
              suggestions.map((suggestion) => {
                const typeInfo = getTypeInfo(suggestion.suggestedType)
                return (
                  <TableRow key={suggestion.id}>
                    {statusFilter === 'pending' && (
                      <TableCell>
                        <Checkbox
                          checked={selected.has(suggestion.id)}
                          onCheckedChange={(checked) => handleSelect(suggestion.id, !!checked)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{suggestion.tag1.name}</Badge>
                        <span className="text-muted-foreground">{typeInfo.icon}</span>
                        <Badge variant="outline">{suggestion.tag2.name}</Badge>
                      </div>
                      {suggestion.suggestionReason && (
                        <p className="text-xs text-muted-foreground mt-1 max-w-[300px] truncate">
                          {suggestion.suggestionReason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={typeInfo.color}>
                        {typeInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {Math.round(suggestion.suggestedStrength * 100)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-green-500 flex items-center gap-0.5">
                          <ThumbsUp className="h-3 w-3" />
                          {suggestion.agreeCount}
                        </span>
                        <span className="text-red-500 flex items-center gap-0.5">
                          <ThumbsDown className="h-3 w-3" />
                          {suggestion.disagreeCount}
                        </span>
                        <Badge
                          variant={suggestion.netVotes > 0 ? 'default' : suggestion.netVotes < 0 ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {suggestion.netVotes > 0 ? '+' : ''}{suggestion.netVotes}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {suggestion.suggestedBy ? (
                          suggestion.suggestedBy.email || 'User'
                        ) : (
                          <Badge variant="outline" className="text-xs">Auto-detected</Badge>
                        )}
                      </span>
                    </TableCell>
                    {statusFilter === 'pending' && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => openEditModal(suggestion)}
                            disabled={isProcessing}
                            title="Edit & Approve"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                            onClick={() => handleApprove(suggestion)}
                            disabled={isProcessing}
                            title="Approve"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => handleReject(suggestion)}
                            disabled={isProcessing}
                            title="Reject"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={!!editingSuggestion} onOpenChange={(open) => !open && setEditingSuggestion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modify & Approve Suggestion</DialogTitle>
            <DialogDescription>
              Adjust the relationship before approving it.
            </DialogDescription>
          </DialogHeader>

          {editingSuggestion && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Badge variant="secondary">{editingSuggestion.tag1.name}</Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="secondary">{editingSuggestion.tag2.name}</Badge>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Relationship Type</label>
                <Select value={editType} onValueChange={setEditType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Strength: {Math.round(editStrength * 100)}%
                </label>
                <Slider
                  value={[editStrength * 100]}
                  onValueChange={([v]) => setEditStrength(v / 100)}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Reason for modification..."
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSuggestion(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => editingSuggestion && handleApprove(
                editingSuggestion,
                editStrength,
                editType,
                editNotes || undefined
              )}
              disabled={isProcessing}
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Approve with Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
