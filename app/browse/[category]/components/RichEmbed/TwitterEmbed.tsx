'use client';

import { Tweet } from 'react-tweet';

interface TwitterEmbedProps {
  tweetId: string;
  variant?: 'preview' | 'full';
}

export default function TwitterEmbed({ tweetId, variant = 'full' }: TwitterEmbedProps) {
  return (
    <div
      className={`
        [&_.react-tweet-theme]:!bg-transparent
        [&_.react-tweet-theme]:!border-zinc-700
        [&_article]:!bg-zinc-800/50
        [&_article]:!border-zinc-700
        [&_a]:!text-green-400
        [&_span]:!text-zinc-300
        ${variant === 'preview' ? 'max-h-64 overflow-hidden' : ''}
      `}
    >
      <Tweet
        id={tweetId}
        fallback={
          <div className="flex items-center justify-center p-8 bg-zinc-800/50 rounded-lg border border-zinc-700">
            <div className="animate-pulse text-zinc-500">Loading tweet...</div>
          </div>
        }
      />
    </div>
  );
}
