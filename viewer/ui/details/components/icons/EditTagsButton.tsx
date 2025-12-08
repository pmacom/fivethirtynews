'use client'

import { Tags } from 'lucide-react'
import { useCurrentUser } from '../../../../hooks/useCurrentUser'
import { useContentEditStore, ContentItem } from '@/components/content-edit'
import { ActionButton } from '../ActionButton'

interface EditTagsButtonProps {
  contentId: string
  contentData: ContentItem
}

/**
 * EditTagsButton - Opens content edit modal to tags tab
 */
export function EditTagsButton({ contentId, contentData }: EditTagsButtonProps) {
  const { canEdit, loading } = useCurrentUser()
  const openEditModal = useContentEditStore((state) => state.open)
  const setActiveTab = useContentEditStore((state) => state.setActiveTab)

  // Don't show if user can't edit or still loading
  if (loading || !canEdit) return null

  const handleClick = () => {
    openEditModal(contentId, contentData)
    // Set tab after opening (store will be ready)
    setTimeout(() => setActiveTab('tags'), 0)
  }

  return (
    <ActionButton
      icon={<Tags className="w-4 h-4" />}
      label="Edit Tags"
      onClick={handleClick}
    />
  )
}

export default EditTagsButton
