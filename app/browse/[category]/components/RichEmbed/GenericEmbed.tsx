'use client';

import { ExternalLink } from 'lucide-react';

interface GenericEmbedProps {
  url: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  platform?: string;
  authorName?: string;
  variant?: 'preview' | 'full';
}

const platformIcons: Record<string, string> = {
  twitter: '𝕏',
  youtube: '▶',
  github: '⌨',
  reddit: '🔴',
  default: '🔗',
};

export default function GenericEmbed({
  url,
  title,
  description,
  thumbnailUrl,
  platform,
  authorName,
  variant = 'full',
}: GenericEmbedProps) {
  const icon = platformIcons[platform?.toLowerCase() || 'default'] || platformIcons.default;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-lg overflow-hidden transition-all group"
    >
      {thumbnailUrl && (
        <div className={`w-full ${variant === 'preview' ? 'h-32' : 'h-48'} bg-zinc-700`}>
          <img
            src={thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0" title={platform}>
            {icon}
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white group-hover:text-green-400 transition-colors line-clamp-2">
              {title || url}
            </h3>
            {description && variant === 'full' && (
              <p className="mt-1 text-sm text-zinc-400 line-clamp-3">{description}</p>
            )}
            <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
              {authorName && <span>@{authorName}</span>}
              <ExternalLink className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>
    </a>
  );
}
