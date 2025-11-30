'use client';

import LabelBadge from './LabelBadge';

interface ContentLabel {
  id: string;
  slug: string;
  name: string;
  color: string;
  text_color: string;
  icon?: string;
  category?: string;
  assigned_at?: string;
  assigned_by?: {
    id: string;
    display_name: string;
    discord_avatar?: string;
  };
}

interface BadgePanelProps {
  labels: ContentLabel[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'vertical' | 'horizontal';
}

export default function BadgePanel({
  labels,
  maxVisible = 3,
  size = 'lg',
  orientation = 'vertical',
}: BadgePanelProps) {
  if (!labels || labels.length === 0) {
    return null;
  }

  const visibleLabels = labels.slice(0, maxVisible);
  const hiddenCount = labels.length - maxVisible;

  return (
    <div
      className={`flex gap-2 ${
        orientation === 'vertical' ? 'flex-col items-start' : 'flex-row flex-wrap items-center'
      }`}
    >
      {visibleLabels.map((label) => (
        <LabelBadge
          key={label.id}
          slug={label.slug}
          name={label.name}
          color={label.color}
          textColor={label.text_color}
          icon={label.icon}
          size={size}
        />
      ))}
      {hiddenCount > 0 && (
        <span className="text-xs text-zinc-500 font-medium">
          +{hiddenCount} more
        </span>
      )}
    </div>
  );
}

export { LabelBadge };
