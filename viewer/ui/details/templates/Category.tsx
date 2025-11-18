import { LiveViewContentBlock } from '@/viewer/core/content/types'
import React from 'react'

interface DetailCategoryProps {
  itemIndex: number
  content: LiveViewContentBlock
}
function DetailCategory({ content, itemIndex }: DetailCategoryProps) {
  return (
    <div className="w-[100vw] slide-detail border-2 border-red-500 text-white">
      {itemIndex} - {content.id} - {content.weight}
    </div>
  )
}

export default DetailCategory