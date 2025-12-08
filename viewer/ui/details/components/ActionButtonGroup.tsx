'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface ActionButtonGroupProps {
  children: React.ReactNode
  position: 'left' | 'right'
  className?: string
}

/**
 * ActionButtonGroup - Container for grouped action buttons
 * Positions buttons above the details bar on left or right side
 */
export function ActionButtonGroup({ children, position, className }: ActionButtonGroupProps) {
  return (
    <div
      className={cn(
        'flex items-end gap-2',
        position === 'left' ? 'justify-start' : 'justify-end',
        className
      )}
    >
      {children}
    </div>
  )
}

export default ActionButtonGroup
