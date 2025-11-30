'use client';

import TagChip from './TagChip';

interface TagChipBarProps {
  tags: string[];
  activeTags?: string[];
  onTagClick?: (tag: string) => void;
  maxVisible?: number;
  size?: 'sm' | 'md';
  interactive?: boolean;
}

export default function TagChipBar({
  tags,
  activeTags = [],
  onTagClick,
  maxVisible,
  size = 'md',
  interactive = true,
}: TagChipBarProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  const visibleTags = maxVisible ? tags.slice(0, maxVisible) : tags;
  const hiddenCount = maxVisible ? Math.max(0, tags.length - maxVisible) : 0;

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {visibleTags.map((tag) => (
        <TagChip
          key={tag}
          tag={tag}
          isActive={activeTags.includes(tag)}
          onClick={onTagClick ? () => onTagClick(tag) : undefined}
          size={size}
          interactive={interactive}
        />
      ))}
      {hiddenCount > 0 && (
        <span className="text-xs text-zinc-500">
          +{hiddenCount} more
        </span>
      )}
    </div>
  );
}

export { TagChip };
