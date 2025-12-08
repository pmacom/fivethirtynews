'use client'

import React, { useMemo } from 'react'
import { ExternalLink } from 'lucide-react'
import { FaYoutube } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'
import { ContentType } from '@/viewer/core/content/types'
import { ActionButton } from '../ActionButton'

interface SourceIconProps {
  type: ContentType
  url: string
}

/**
 * SourceIcon - Opens original source in new tab
 * Shows platform-specific icon
 */
export function SourceIcon({ type, url }: SourceIconProps) {
  const TypeIcon = useMemo(() => {
    switch (type) {
      case ContentType.VIDEO:
        return <FaYoutube className="w-4 h-4" />
      case ContentType.TWITTER:
        return <FaXTwitter className="w-4 h-4" />
      default:
        return <ExternalLink className="w-4 h-4" />
    }
  }, [type])

  const handleClick = () => {
    window.open(url, '_blank')
  }

  return (
    <ActionButton
      icon={TypeIcon}
      label="Source"
      onClick={handleClick}
    />
  )
}

export default SourceIcon
