import { ContentType } from '@/viewer/core/content/types'
import React, { useMemo } from 'react'
import { FaYoutube } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

interface SourceIconProps {
  type: ContentType
  url: string
}

export const SourceIcon = ({ type, url }: SourceIconProps) => {
  const TypeIcon = useMemo(() => {
    switch(type) {
      case ContentType.VIDEO:
        return <FaYoutube />
      case ContentType.TWITTER:
        return <FaXTwitter />
      case ContentType.WARPCAST:
        return <div>Warpcast</div>
      case ContentType.WEBSITE:
        return <div>Website</div>
      case ContentType.DISCORD:
        return <div>Discord</div>
      case ContentType.IMAGE:
        return <div>Image</div>
    }
  }, [type])

  const onClick = () => {
    window.open(url, '_blank')
  }

  return (
    <span onClick={onClick} className="m-2 inline-flex flex-col items-center justify-center opacity-50 cursor-pointer hover:opacity-100">
      <div className="text-xs pb-2 uppercase">Source</div>
      <span className="border-2 rounded-full p-2 w-10 h-10 flex items-center justify-center">
        {TypeIcon}
      </span>
    </span>
  )
}

export default SourceIcon