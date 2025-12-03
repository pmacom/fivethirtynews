'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ColumnHeader } from './ColumnHeader';
import { KanbanCard } from './KanbanCard';
import type { KanbanColumn as KanbanColumnType } from '@/stores/curateStore';

interface KanbanColumnProps {
  column: KanbanColumnType;
  onEditColumn: (columnId: string, title: string, tags: string[]) => void;
  onDeleteColumn: (columnId: string) => void;
  onToggleSelection: (columnId: string, contentId: string, isSelected: boolean) => void;
  onSelectAll: (columnId: string) => void;
  onDeselectAll: (columnId: string) => void;
  dragHandleProps?: any;
}

export function KanbanColumn({
  column,
  onEditColumn,
  onDeleteColumn,
  onToggleSelection,
  onSelectAll,
  onDeselectAll,
  dragHandleProps,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const selectedItems = column.items.filter((item) => item.is_selected);
  const unselectedItems = column.items.filter((item) => !item.is_selected);

  // For sortable context, we only include selected items since those are draggable
  const sortableItemIds = selectedItems.map((item) => item.id);

  return (
    <div
      className={cn(
        'flex flex-col h-full min-w-[320px] max-w-[320px] rounded-lg border bg-card shadow-sm transition-all',
        isOver && 'ring-2 ring-primary'
      )}
    >
      <ColumnHeader
        title={column.title}
        description={column.description}
        tags={column.tags}
        itemCount={column.items.length}
        selectedCount={selectedItems.length}
        onEdit={(title, tags) => onEditColumn(column.id, title, tags)}
        onDelete={() => onDeleteColumn(column.id)}
        onSelectAll={() => onSelectAll(column.id)}
        onDeselectAll={() => onDeselectAll(column.id)}
        dragHandleProps={dragHandleProps}
      />

      <ScrollArea className="flex-1">
        <div ref={setNodeRef} className="p-2 space-y-2 min-h-[200px]">
          <SortableContext items={sortableItemIds} strategy={verticalListSortingStrategy}>
            {/* Selected items first (draggable) */}
            {selectedItems.map((item) => (
              <KanbanCard
                key={item.id}
                item={item}
                columnId={column.id}
                columnTags={column.tags}
                onToggleSelection={onToggleSelection}
              />
            ))}

            {/* Divider if both selected and unselected exist */}
            {selectedItems.length > 0 && unselectedItems.length > 0 && (
              <div className="flex items-center gap-2 py-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">suggestions</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}

            {/* Unselected items (not draggable) */}
            {unselectedItems.map((item) => (
              <KanbanCard
                key={item.id}
                item={item}
                columnId={column.id}
                columnTags={column.tags}
                onToggleSelection={onToggleSelection}
                isDragDisabled
              />
            ))}
          </SortableContext>

          {column.items.length === 0 && (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              No content matching tags
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default KanbanColumn;
