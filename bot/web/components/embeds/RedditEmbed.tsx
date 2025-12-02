'use client'

import { useEffect, useRef } from 'react'

interface RedditEmbedProps {
  url: string
}

export default function RedditEmbed({ url }: RedditEmbedProps) {
  const embedRef = useRef<HTMLDivElement>(null)
  const scriptLoadedRef = useRef(false)

  useEffect(() => {
    // Only load script once
    if (scriptLoadedRef.current) {
      // If script already loaded, just process embeds
      if (window.rembeddit) {
        window.rembeddit.init()
      }
      return
    }

    const script = document.createElement('script')
    script.src = 'https://embed.reddit.com/widgets.js'
    script.async = true
    script.charset = 'UTF-8'

    script.onload = () => {
      scriptLoadedRef.current = true
    }

    document.body.appendChild(script)

    return () => {
      // Don't remove script to avoid reloading it
    }
  }, [])

  return (
    <div ref={embedRef} className="w-full max-w-3xl mx-auto">
      <blockquote className="reddit-embed-bq" data-embed-height="500">
        <a href={url}>{url}</a>
      </blockquote>
    </div>
  )
}

// Type for Reddit embed script
declare global {
  interface Window {
    rembeddit?: {
      init: () => void
    }
  }
}
