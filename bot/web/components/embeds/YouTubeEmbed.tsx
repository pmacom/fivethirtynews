'use client'

import LiteYouTubeEmbed from 'react-lite-youtube-embed'
import 'react-lite-youtube-embed/dist/LiteYouTubeEmbed.css'

interface YouTubeEmbedProps {
  videoId: string
  title?: string
}

export default function YouTubeEmbed({ videoId, title = 'YouTube Video' }: YouTubeEmbedProps) {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <LiteYouTubeEmbed
        id={videoId}
        title={title}
        poster="hqdefault"
      />
    </div>
  )
}
