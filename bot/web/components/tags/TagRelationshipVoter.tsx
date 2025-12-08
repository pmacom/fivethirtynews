'use client'

import React, { useState, useCallback } from 'react'
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export interface TagInfo {
  id: string
  name: string
  slug: string
}

export type VoteValue = 'agree' | 'disagree' | 'unsure' | null

export interface TagRelationshipVoterProps {
  /** First tag in the relationship */
  tag1: TagInfo
  /** Second tag in the relationship */
  tag2: TagInfo
  /** Type of relationship */
  relationshipType: 'related' | 'tool_of' | 'technique_of' | 'part_of'
  /** Strength of the relationship (0-1) */
  strength: number
  /** Effective strength after community modifier */
  effectiveStrength?: number
  /** User's current vote (null if not voted) */
  userVote?: VoteValue
  /** Total agree votes */
  agreeCount?: number
  /** Total disagree votes */
  disagreeCount?: number
  /** Community score (-1 to 1) */
  communityScore?: number | null
  /** Relationship ID (if existing relationship) */
  relationshipId?: string
  /** Callback when user votes */
  onVote?: (vote: 'agree' | 'disagree') => Promise<void>
  /** Compact mode for inline display */
  compact?: boolean
  /** Show vote counts */
  showCounts?: boolean
  /** Custom class name */
  className?: string
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  related: 'related to',
  tool_of: 'tool of',
  technique_of: 'technique of',
  part_of: 'part of',
}

const RELATIONSHIP_ARROWS: Record<string, string> = {
  related: '↔',
  tool_of: '→',
  technique_of: '→',
  part_of: '⊂',
}

export function TagRelationshipVoter({
  tag1,
  tag2,
  relationshipType,
  strength,
  effectiveStrength,
  userVote = null,
  agreeCount = 0,
  disagreeCount = 0,
  communityScore = null,
  relationshipId,
  onVote,
  compact = false,
  showCounts = true,
  className,
}: TagRelationshipVoterProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [currentVote, setCurrentVote] = useState<VoteValue>(userVote)
  const [localAgreeCount, setLocalAgreeCount] = useState(agreeCount)
  const [localDisagreeCount, setLocalDisagreeCount] = useState(disagreeCount)

  const handleVote = useCallback(async (vote: 'agree' | 'disagree') => {
    if (!onVote || isLoading) return

    setIsLoading(true)

    // Optimistic update
    const previousVote = currentVote
    const wasAgree = previousVote === 'agree'
    const wasDisagree = previousVote === 'disagree'

    // Update local state optimistically
    if (vote === 'agree') {
      setCurrentVote('agree')
      setLocalAgreeCount(prev => prev + 1)
      if (wasDisagree) setLocalDisagreeCount(prev => prev - 1)
    } else {
      setCurrentVote('disagree')
      setLocalDisagreeCount(prev => prev + 1)
      if (wasAgree) setLocalAgreeCount(prev => prev - 1)
    }

    try {
      await onVote(vote)
    } catch (error) {
      // Revert on error
      setCurrentVote(previousVote)
      setLocalAgreeCount(agreeCount)
      setLocalDisagreeCount(disagreeCount)
      console.error('Vote failed:', error)
    } finally {
      setIsLoading(false)
    }
  }, [onVote, isLoading, currentVote, agreeCount, disagreeCount])

  const strengthPercent = Math.round((effectiveStrength ?? strength) * 100)
  const netVotes = localAgreeCount - localDisagreeCount

  if (compact) {
    return (
      <TooltipProvider>
        <div className={cn('inline-flex items-center gap-1', className)}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={currentVote === 'agree' ? 'default' : 'ghost'}
                size="icon-sm"
                onClick={() => handleVote('agree')}
                disabled={isLoading}
                className="h-6 w-6"
              >
                {isLoading && currentVote !== 'agree' ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ThumbsUp className={cn('h-3 w-3', currentVote === 'agree' && 'fill-current')} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Agree with this relationship</TooltipContent>
          </Tooltip>

          {showCounts && (
            <span className={cn(
              'text-xs tabular-nums min-w-[2ch] text-center',
              netVotes > 0 && 'text-green-600 dark:text-green-400',
              netVotes < 0 && 'text-red-600 dark:text-red-400',
              netVotes === 0 && 'text-muted-foreground'
            )}>
              {netVotes > 0 ? `+${netVotes}` : netVotes}
            </span>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={currentVote === 'disagree' ? 'destructive' : 'ghost'}
                size="icon-sm"
                onClick={() => handleVote('disagree')}
                disabled={isLoading}
                className="h-6 w-6"
              >
                {isLoading && currentVote !== 'disagree' ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ThumbsDown className={cn('h-3 w-3', currentVote === 'disagree' && 'fill-current')} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Disagree with this relationship</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    )
  }

  return (
    <div className={cn('flex flex-col gap-2 p-3 rounded-lg border bg-card', className)}>
      {/* Relationship display */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary" className="font-medium">
          {tag1.name}
        </Badge>
        <span className="text-muted-foreground text-sm flex items-center gap-1">
          <span>{RELATIONSHIP_ARROWS[relationshipType]}</span>
          <span className="italic">{RELATIONSHIP_LABELS[relationshipType]}</span>
          <span className="text-xs">({strengthPercent}%)</span>
        </span>
        <Badge variant="secondary" className="font-medium">
          {tag2.name}
        </Badge>
      </div>

      {/* Voting controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={currentVote === 'agree' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleVote('agree')}
                  disabled={isLoading}
                >
                  {isLoading && currentVote !== 'agree' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <ThumbsUp className={cn('h-4 w-4 mr-1', currentVote === 'agree' && 'fill-current')} />
                  )}
                  {showCounts && localAgreeCount}
                </Button>
              </TooltipTrigger>
              <TooltipContent>This relationship makes sense</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={currentVote === 'disagree' ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => handleVote('disagree')}
                  disabled={isLoading}
                >
                  {isLoading && currentVote !== 'disagree' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <ThumbsDown className={cn('h-4 w-4 mr-1', currentVote === 'disagree' && 'fill-current')} />
                  )}
                  {showCounts && localDisagreeCount}
                </Button>
              </TooltipTrigger>
              <TooltipContent>This relationship doesn&apos;t make sense</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Community score indicator */}
        {communityScore !== null && (
          <div className="text-xs text-muted-foreground">
            Community: {' '}
            <span className={cn(
              'font-medium',
              communityScore > 0.2 && 'text-green-600 dark:text-green-400',
              communityScore < -0.2 && 'text-red-600 dark:text-red-400',
            )}>
              {communityScore > 0 ? '+' : ''}{(communityScore * 100).toFixed(0)}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default TagRelationshipVoter
