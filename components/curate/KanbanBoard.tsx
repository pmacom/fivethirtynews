'use client';

import { useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { KanbanColumn } from './KanbanColumn';
import { AddColumnDialog } from './AddColumnDialog';
import { useCurateStore, type KanbanColumn as KanbanColumnType } from '@/stores/curateStore';

interface KanbanBoardProps {
  showSlug: string;
  episodeId: string;
}

export function KanbanBoard({ showSlug, episodeId }: KanbanBoardProps) {
  const {
    columns,
    activeCardId,
    setActiveCardId,
    addColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    toggleItemSelection,
    reorderItems,
    selectAllInColumn,
    deselectAllInColumn,
  } = useCurateStore();

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      setActiveCardId(active.id as string);
    },
    [setActiveCardId]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveCardId(null);

      if (!over || active.id === over.id) return;

      // Find what we're dragging
      const activeId = active.id as string;
      const overId = over.id as string;

      // Check if dragging a column
      const activeColumn = columns.find((col) => col.id === activeId);
      const overColumn = columns.find((col) => col.id === overId);

      if (activeColumn) {
        // Column reorder
        const oldIndex = columns.findIndex((col) => col.id === activeId);
        const newIndex = columns.findIndex((col) => col.id === overId);

        if (oldIndex !== newIndex) {
          const newOrder = arrayMove(columns, oldIndex, newIndex);
          reorderColumns(showSlug, episodeId, newOrder.map((c) => c.id));
        }
        return;
      }

      // Item reorder within column
      // Find which column contains the active item
      let sourceColumn: KanbanColumnType | undefined;
      for (const col of columns) {
        if (col.items.some((item) => item.id === activeId)) {
          sourceColumn = col;
          break;
        }
      }

      if (!sourceColumn) return;

      // Get selected items in the source column
      const selectedItems = sourceColumn.items.filter((item) => item.is_selected);
      const oldIndex = selectedItems.findIndex((item) => item.id === activeId);
      const newIndex = selectedItems.findIndex((item) => item.id === overId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newOrder = arrayMove(selectedItems, oldIndex, newIndex);
        reorderItems(showSlug, episodeId, sourceColumn.id, newOrder.map((i) => i.id));
      }
    },
    [columns, showSlug, episodeId, reorderColumns, reorderItems, setActiveCardId]
  );

  const handleAddColumn = useCallback(
    (title: string, tags: string[]) => {
      addColumn(showSlug, episodeId, title, tags);
    },
    [showSlug, episodeId, addColumn]
  );

  const handleEditColumn = useCallback(
    (columnId: string, title: string, tags: string[]) => {
      updateColumn(showSlug, episodeId, columnId, { title, tags });
    },
    [showSlug, episodeId, updateColumn]
  );

  const handleDeleteColumn = useCallback(
    (columnId: string) => {
      deleteColumn(showSlug, episodeId, columnId);
    },
    [showSlug, episodeId, deleteColumn]
  );

  const handleToggleSelection = useCallback(
    (columnId: string, contentId: string, isSelected: boolean) => {
      toggleItemSelection(showSlug, episodeId, columnId, contentId, isSelected);
    },
    [showSlug, episodeId, toggleItemSelection]
  );

  const handleSelectAll = useCallback(
    (columnId: string) => {
      selectAllInColumn(showSlug, episodeId, columnId);
    },
    [showSlug, episodeId, selectAllInColumn]
  );

  const handleDeselectAll = useCallback(
    (columnId: string) => {
      deselectAllInColumn(showSlug, episodeId, columnId);
    },
    [showSlug, episodeId, deselectAllInColumn]
  );

  const columnIds = columns.map((col) => col.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="w-full">
        <div className="flex gap-4 p-4 min-h-[calc(100vh-200px)]">
          <SortableContext
            items={columnIds}
            strategy={horizontalListSortingStrategy}
          >
            {columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                onEditColumn={handleEditColumn}
                onDeleteColumn={handleDeleteColumn}
                onToggleSelection={handleToggleSelection}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
              />
            ))}
          </SortableContext>

          <AddColumnDialog onAdd={handleAddColumn} />
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </DndContext>
  );
}

export default KanbanBoard;
