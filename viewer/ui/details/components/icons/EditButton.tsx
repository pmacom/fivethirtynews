'use client'

import { LayoutGrid } from 'lucide-react'
import { useCurrentUser } from '../../../../hooks/useCurrentUser'
import { useContentEditStore, ContentItem } from '@/components/content-edit'
import { ActionButton } from '../ActionButton'

interface EditButtonProps {
  contentId: string
  contentData: ContentItem
}

/**
 * EditButton - Opens content edit modal to category/channel tab
 */
export function EditButton({ contentId, contentData }: EditButtonProps) {
  const { canEdit, loading } = useCurrentUser()
  const openEditModal = useContentEditStore((state) => state.open)

  // Don't show if user can't edit or still loading
  if (loading || !canEdit) return null

  const handleClick = () => {
    openEditModal(contentId, contentData)
  }

  return (
    <ActionButton
      icon={<LayoutGrid className="w-4 h-4" />}
      label="Edit Cat"
      onClick={handleClick}
    />
  )
}

export default EditButton
