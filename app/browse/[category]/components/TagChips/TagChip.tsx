'use client';

import { useRouter } from 'next/navigation';
import { MouseEvent } from 'react';

interface TagChipProps {
  tag: string;
  onClick?: () => void;
  isActive?: boolean;
  size?: 'sm' | 'md';
  interactive?: boolean; // Set to false when inside a button/clickable container
}

// Color mapping for common tags
const tagColors: Record<string, string> = {
  ai: 'bg-purple-600 hover:bg-purple-500',
  llm: 'bg-purple-600 hover:bg-purple-500',
  art: 'bg-pink-600 hover:bg-pink-500',
  video: 'bg-red-600 hover:bg-red-500',
  audio: 'bg-orange-600 hover:bg-orange-500',
  code: 'bg-blue-600 hover:bg-blue-500',
  robotics: 'bg-orange-600 hover:bg-orange-500',
  metaverse: 'bg-cyan-600 hover:bg-cyan-500',
  medicine: 'bg-red-600 hover:bg-red-500',
  thirddimension: 'bg-indigo-600 hover:bg-indigo-500',
  '3d': 'bg-indigo-600 hover:bg-indigo-500',
  tutorial: 'bg-green-600 hover:bg-green-500',
  demo: 'bg-teal-600 hover:bg-teal-500',
  tool: 'bg-amber-600 hover:bg-amber-500',
};

const defaultColor = 'bg-zinc-600 hover:bg-zinc-500';

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export default function TagChip({
  tag,
  onClick,
  isActive = false,
  size = 'md',
  interactive = true,
}: TagChipProps) {
  const router = useRouter();

  const colorClass = tagColors[tag.toLowerCase()] || defaultColor;
  const activeClass = isActive ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : '';

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation(); // Prevent parent button/card click
    if (onClick) {
      onClick();
    } else if (interactive) {
      router.push(`/browse/${tag.toLowerCase()}`);
    }
  };

  // Use span when non-interactive to avoid button-in-button
  if (!interactive) {
    return (
      <span
        className={`
          inline-flex items-center rounded-full
          font-medium text-white
          ${tagColors[tag.toLowerCase()] || 'bg-zinc-600'}
          ${activeClass}
          ${sizeClasses[size]}
        `}
      >
        {tag}
      </span>
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick(e as unknown as MouseEvent)}
      className={`
        inline-flex items-center rounded-full
        font-medium text-white
        transition-all cursor-pointer
        ${colorClass}
        ${activeClass}
        ${sizeClasses[size]}
      `}
    >
      {tag}
    </span>
  );
}
