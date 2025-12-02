'use client'

import { PostThread } from 'react-bluesky-embed'

interface BlueskyEmbedProps {
  postUrl: string
}

/**
 * Extract DID and rkey from Bluesky post URL
 * URL format: https://bsky.app/profile/{did}/post/{rkey}
 */
function parseBlueskyUrl(url: string): { did: string; rkey: string } | null {
  try {
    const match = url.match(/profile\/([^/]+)\/post\/([^/?#]+)/)
    if (match) {
      return { did: match[1], rkey: match[2] }
    }
    return null
  } catch {
    return null
  }
}

export default function BlueskyEmbed({ postUrl }: BlueskyEmbedProps) {
  const params = parseBlueskyUrl(postUrl)

  if (!params) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Invalid Bluesky post URL</p>
        <a
          href={postUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-400 hover:text-purple-300 mt-2 inline-block"
        >
          View on Bluesky →
        </a>
      </div>
    )
  }

  return (
    <div className="flex justify-center w-full max-w-3xl mx-auto">
      <PostThread
        params={params}
        theme="dark"
        hidePost={false}
        config={{
          depth: 0 // Don't show replies by default
        }}
      />
    </div>
  )
}
