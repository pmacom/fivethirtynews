'use client'

import dynamic from 'next/dynamic'

// Dynamically import embed components for code splitting
const TwitterEmbed = dynamic(() => import('./TwitterEmbed'), {
  loading: () => <div className="animate-pulse bg-muted h-64 rounded-xl" />,
  ssr: false
})

const YouTubeEmbed = dynamic(() => import('./YouTubeEmbed'), {
  loading: () => <div className="animate-pulse bg-muted h-64 rounded-xl" />,
  ssr: false
})

const RedditEmbed = dynamic(() => import('./RedditEmbed'), {
  loading: () => <div className="animate-pulse bg-muted h-64 rounded-xl" />,
  ssr: false
})

const BlueskyEmbed = dynamic(() => import('./BlueskyEmbed'), {
  loading: () => <div className="animate-pulse bg-muted h-64 rounded-xl" />,
  ssr: false
})

interface ContentEmbedProps {
  platform: string
  url: string
  platformContentId: string
  title?: string
  author?: string
  tags?: string[]
}

/**
 * Extract ID from URL or use platformContentId directly
 */
function extractId(platform: string, url: string, platformContentId: string): string {
  // For Twitter, platformContentId is the tweet ID
  if (platform === 'twitter') {
    return platformContentId
  }

  // For YouTube, platformContentId is the video ID
  if (platform === 'youtube') {
    return platformContentId
  }

  // For Reddit and Bluesky, return the full URL
  return url
}

export default function ContentEmbed({
  platform,
  url,
  platformContentId,
  title,
  author,
  tags
}: ContentEmbedProps) {
  const id = extractId(platform, url, platformContentId)

  return (
    <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:border-purple-500/30 transition-all">
      {/* Metadata Header */}
      <div className="mb-4 pb-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              platform === 'twitter' ? 'bg-blue-500/20 text-blue-300' :
              platform === 'youtube' ? 'bg-red-500/20 text-red-300' :
              platform === 'reddit' ? 'bg-orange-500/20 text-orange-300' :
              platform === 'bluesky' ? 'bg-sky-500/20 text-sky-300' :
              'bg-gray-500/20 text-gray-300'
            }`}>
              {platform === 'twitter' ? '𝕏' :
               platform === 'youtube' ? '▶' :
               platform === 'reddit' ? 'r/' :
               platform === 'bluesky' ? '☁️' :
               platform}
            </span>
            {author && (
              <span className="text-sm font-medium text-foreground">{author}</span>
            )}
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            View Original →
          </a>
        </div>

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-md text-xs font-medium border border-purple-500/30"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Embed Content */}
      <div className="mb-2">
        {platform === 'twitter' && <TwitterEmbed tweetId={id} />}
        {platform === 'youtube' && <YouTubeEmbed videoId={id} title={title} />}
        {platform === 'reddit' && <RedditEmbed url={url} />}
        {platform === 'bluesky' && <BlueskyEmbed postUrl={url} />}

        {/* Fallback for unsupported platforms */}
        {!['twitter', 'youtube', 'reddit', 'bluesky'].includes(platform) && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Embed not available for {platform}</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 mt-2 inline-block"
            >
              View on {platform} →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
