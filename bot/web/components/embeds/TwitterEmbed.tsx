'use client'

import { Tweet } from 'react-tweet'

interface TwitterEmbedProps {
  tweetId: string
}

export default function TwitterEmbed({ tweetId }: TwitterEmbedProps) {
  return (
    <div className="flex justify-center">
      <Tweet id={tweetId} />
    </div>
  )
}
