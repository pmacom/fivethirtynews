'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { GripVertical, ExternalLink, Clock, Image as ImageIcon } from 'lucide-react';
import type { KanbanItem } from '@/stores/curateStore';

interface KanbanCardProps {
  item: KanbanItem;
  columnId: string;
  columnTags?: string[];
  onToggleSelection: (columnId: string, contentId: string, isSelected: boolean) => void;
  isDragDisabled?: boolean;
}

// Format relative time
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function KanbanCard({
  item,
  columnId,
  columnTags = [],
  onToggleSelection,
  isDragDisabled = false,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled: isDragDisabled || !item.is_selected,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const { content } = item;

  const handleCheckboxChange = (checked: boolean) => {
    onToggleSelection(columnId, item.id, item.is_selected);
  };

  const getPlatformColor = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case 'twitter':
      case 'x':
        return 'bg-blue-500';
      case 'youtube':
        return 'bg-red-500';
      case 'tiktok':
        return 'bg-pink-500';
      case 'instagram':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card
        className={cn(
          'p-3 transition-all',
          isDragging && 'opacity-50 shadow-lg ring-2 ring-primary',
          !item.is_selected && 'opacity-60',
          item.is_selected && 'border-primary/50'
        )}
      >
        <div className="flex gap-3">
          {/* Drag handle - only for selected items */}
          {item.is_selected && !isDragDisabled && (
            <div
              {...listeners}
              className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="h-5 w-5" />
            </div>
          )}

          {/* Checkbox */}
          <div className="flex-shrink-0 pt-0.5">
            <Checkbox
              checked={item.is_selected}
              onCheckedChange={handleCheckboxChange}
              className="h-5 w-5"
            />
          </div>

          {/* Thumbnail */}
          <div className="flex-shrink-0 w-20 h-20 rounded overflow-hidden bg-muted">
            {content.thumbnail_url ? (
              <img
                src={content.thumbnail_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Platform badge + time */}
            <div className="flex items-center gap-2 mb-1">
              <span
                className={cn(
                  'px-1.5 py-0.5 text-[10px] font-medium text-white rounded',
                  getPlatformColor(content.platform)
                )}
              >
                {content.platform?.toUpperCase()}
              </span>
              {content.approval_status !== 'approved' && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-yellow-500/20 text-yellow-600 rounded">
                  {content.approval_status}
                </span>
              )}
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
                <Clock className="w-3 h-3" />
                {formatRelativeTime(content.created_at)}
              </span>
            </div>

            {/* Title or description */}
            <p className="text-sm font-medium line-clamp-2 mb-1">
              {content.title || content.description || 'No title'}
            </p>

            {/* Author */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              {content.author_avatar_url && (
                <img
                  src={content.author_avatar_url}
                  alt=""
                  className="w-4 h-4 rounded-full"
                />
              )}
              <span className="truncate">{content.author_name || 'Unknown'}</span>
            </div>

            {/* Tags - highlight matching ones */}
            {content.tags && content.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {content.tags.slice(0, 4).map((tag) => {
                  const isMatching = columnTags.includes(tag);
                  return (
                    <span
                      key={tag}
                      className={cn(
                        "px-1.5 py-0.5 text-[10px] rounded",
                        isMatching
                          ? "bg-primary/20 text-primary font-medium"
                          : "bg-secondary text-secondary-foreground"
                      )}
                    >
                      {tag}
                    </span>
                  );
                })}
                {content.tags.length > 4 && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-secondary text-secondary-foreground rounded">
                    +{content.tags.length - 4}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* External link */}
          <a
            href={content.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </Card>
    </div>
  );
}

export default KanbanCard;
