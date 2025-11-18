/**
 * CopyButton - Copies content URL to clipboard
 * Shows visual feedback on successful copy
 */

import React, { useState } from 'react'
import { FaCopy, FaCheck } from 'react-icons/fa'

interface CopyButtonProps {
  url: string
}

export const CopyButton = ({ url }: CopyButtonProps) => {
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
    <span
      onClick={handleCopy}
      className="m-2 inline-flex flex-col items-center justify-center opacity-50 cursor-pointer hover:opacity-100 transition-opacity"
    >
      <div className="text-xs pb-2 uppercase">
        {copied ? 'Copied!' : 'Copy'}
      </div>
      <span className={`border-2 rounded-full p-2 w-10 h-10 flex items-center justify-center transition-colors ${
        copied ? 'border-green-500 text-green-500' : ''
      }`}>
        {copied ? <FaCheck /> : <FaCopy />}
      </span>
    </span>
  )
}

export default CopyButton
