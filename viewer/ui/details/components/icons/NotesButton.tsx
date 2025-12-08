'use client'

import { MessageCircle } from 'lucide-react'
import { useCurrentUser } from '../../../../hooks/useCurrentUser'
import { useContentEditStore, ContentItem } from '@/components/content-edit'
import { ActionButton } from '../ActionButton'

interface NotesButtonProps {
  contentId: string
  contentData: ContentItem
}

/**
 * NotesButton - Opens content edit modal to notes tab
 */
export function NotesButton({ contentId, contentData }: NotesButtonProps) {
  const { canEdit, loading } = useCurrentUser()
  const openEditModal = useContentEditStore((state) => state.open)
  const setActiveTab = useContentEditStore((state) => state.setActiveTab)

  // Don't show if user can't edit or still loading
  if (loading || !canEdit) return null

  const handleClick = () => {
    openEditModal(contentId, contentData)
    // Set tab after opening (store will be ready)
    setTimeout(() => setActiveTab('notes'), 0)
  }

  return (
    <ActionButton
      icon={<MessageCircle className="w-4 h-4" />}
      label="Notes"
      onClick={handleClick}
    />
  )
}

export default NotesButton
