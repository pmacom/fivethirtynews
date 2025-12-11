'use client'

import React from 'react'

interface BrowseActionButtonProps {
  onClick: () => void
  icon: React.ReactNode
  label: string
  isActive?: boolean
  disabled?: boolean
}

/**
 * Reusable action button for browse mode
 * Styled to match the viewer UI theme
 */
export function BrowseActionButton({
  onClick,
  icon,
  label,
  isActive = false,
  disabled = false,
}: BrowseActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg
        border transition-all duration-200
        ${isActive
          ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
          : 'bg-black/50 border-white/20 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/40'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        backdrop-blur-sm
      `}
      title={label}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}

export default BrowseActionButton
