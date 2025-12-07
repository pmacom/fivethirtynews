"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, ChevronLeft } from 'lucide-react'

interface EpisodeNavigation {
  prev: { id: string; episode_number: number; title: string } | null
  next: { id: string; episode_number: number; title: string } | null
}

interface EpisodeNavProps {
  showSlug: string
  showName: string
  episodeNumber: number
  episodeTitle?: string
  navigation?: EpisodeNavigation
}

export const EpisodeNav = ({
  showSlug,
  showName,
  episodeNumber,
  episodeTitle,
  navigation,
}: EpisodeNavProps) => {
  const router = useRouter()

  return (
    <div className="flex items-center gap-4">
      {/* Back to show */}
      <button
        onClick={() => router.push(`/show/${showSlug}`)}
        className="wtf--ui--container rounded flex items-center gap-1 cursor-pointer transition-all duration-200 hover:scale-105"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="text-sm font-medium pr-1">{showName}</span>
      </button>

      {/* Episode info */}
      <div className="flex items-center gap-2 text-white/80">
        <span className="font-bold">#{episodeNumber}</span>
        {episodeTitle && (
          <span className="text-white/60 hidden sm:inline max-w-[200px] truncate">
            {episodeTitle}
          </span>
        )}
      </div>

      {/* Prev/Next navigation */}
      {navigation && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigation.prev && router.push(`/show/${showSlug}/${navigation.prev.episode_number}`)}
            disabled={!navigation.prev}
            className="wtf--ui--container rounded cursor-pointer transition-all duration-200 hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed"
            title={navigation.prev ? `Episode #${navigation.prev.episode_number}` : undefined}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => navigation.next && router.push(`/show/${showSlug}/${navigation.next.episode_number}`)}
            disabled={!navigation.next}
            className="wtf--ui--container rounded cursor-pointer transition-all duration-200 hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed"
            title={navigation.next ? `Episode #${navigation.next.episode_number}` : undefined}
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

export default EpisodeNav
