'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export interface ActionButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
  className?: string
}

/**
 * ActionButton - Reusable icon button for overlay actions
 * Used for Copy, Source, Edit, Notes, etc.
 * Label shows as tooltip on hover
 */
export function ActionButton({
  icon,
  label,
  onClick,
  active = false,
  disabled = false,
  className,
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        'group relative inline-flex items-center justify-center cursor-pointer transition-all',
        'opacity-70 hover:opacity-100',
        disabled && 'opacity-30 cursor-not-allowed',
        className
      )}
    >
      <span
        className={cn(
          'border-2 rounded-full p-1.5 w-9 h-9 flex items-center justify-center transition-colors',
          'border-white/40 text-white/80',
          'hover:border-white/70 hover:text-white',
          active && 'border-green-500 text-green-500'
        )}
      >
        {icon}
      </span>
    </button>
  )
}

export default ActionButton
