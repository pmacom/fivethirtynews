'use client'

import { MessageCircle } from 'lucide-react'
import { useCurrentUser } from '../../../../hooks/useCurrentUser'
import { ActionButton } from '../ActionButton'

interface NotesButtonProps {
  onToggle: () => void
  hasNotes: boolean
}

/**
 * NotesButton - Toggles inline notes panel
 * Shows green indicator when notes exist
 */
export function NotesButton({ onToggle, hasNotes }: NotesButtonProps) {
  const { canEdit, loading } = useCurrentUser()

  // Don't show if user can't edit or still loading
  if (loading || !canEdit) return null

  return (
    <ActionButton
      icon={<MessageCircle className="w-4 h-4" />}
      label="Notes"
      onClick={onToggle}
      active={hasNotes}
    />
  )
}

export default NotesButton
