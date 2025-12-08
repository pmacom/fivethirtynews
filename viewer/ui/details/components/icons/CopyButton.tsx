'use client'

import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { ActionButton } from '../ActionButton'

interface CopyButtonProps {
  url: string
}

/**
 * CopyButton - Copies content URL to clipboard
 * Shows visual feedback on successful copy
 */
export function CopyButton({ url }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

  return (
    <ActionButton
      icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      label={copied ? 'Copied!' : 'Copy'}
      onClick={handleCopy}
      active={copied}
    />
  )
}

export default CopyButton
