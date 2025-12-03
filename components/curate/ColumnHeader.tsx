'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MoreHorizontal, Pencil, Trash2, GripVertical, CheckSquare, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColumnHeaderProps {
  title: string;
  description?: string | null;
  tags?: string[];
  itemCount: number;
  selectedCount: number;
  onEdit: (title: string, tags: string[]) => void;
  onDelete: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  dragHandleProps?: any;
}

export function ColumnHeader({
  title,
  description,
  tags = [],
  itemCount,
  selectedCount,
  onEdit,
  onDelete,
  onSelectAll,
  onDeselectAll,
  dragHandleProps,
}: ColumnHeaderProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editTags, setEditTags] = useState(tags.join(', '));

  const handleEdit = () => {
    const newTags = editTags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    onEdit(editTitle, newTags);
    setIsEditOpen(false);
  };

  const handleDelete = () => {
    onDelete();
    setIsDeleteOpen(false);
  };

  return (
    <>
      <div className="flex items-center gap-2 p-3 border-b bg-muted/50">
        {/* Drag handle for column reordering */}
        {dragHandleProps && (
          <div
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="h-4 w-4" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm truncate">{title}</h3>
            <span className="text-xs text-muted-foreground">
              {selectedCount}/{itemCount}
            </span>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {selectedCount < itemCount && (
              <DropdownMenuItem onClick={onSelectAll}>
                <CheckSquare className="h-4 w-4 mr-2" />
                Select All ({itemCount - selectedCount})
              </DropdownMenuItem>
            )}
            {selectedCount > 0 && (
              <DropdownMenuItem onClick={onDeselectAll}>
                <Square className="h-4 w-4 mr-2" />
                Deselect All ({selectedCount})
              </DropdownMenuItem>
            )}
            {(selectedCount > 0 || selectedCount < itemCount) && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Column
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setIsDeleteOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Column</DialogTitle>
            <DialogDescription>
              Update the column title and tags used to filter content.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Column title"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags (comma-separated)</label>
              <Input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="tag1, tag2, tag3"
              />
              <p className="text-xs text-muted-foreground">
                Content matching any of these tags will appear in this column.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Column</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{title}&quot;? This will remove all
              selected items from this column. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ColumnHeader;
