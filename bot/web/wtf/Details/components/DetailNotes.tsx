import { Separator } from '@/components/ui/separator'
import { LiveViewContentBlockItems } from "@/wtf/Content/types"
import React from 'react'

interface DetailNotesProps {
  data: LiveViewContentBlockItems
}
/**
 * DetailNotes Component
 * 
 * This component is responsible for rendering the notes section of a content item.
 * It receives data of type LiveViewContentBlockItems and displays the associated notes.
 * 
 * @component
 */

export const DetailNotes = ({ data }:DetailNotesProps) => {
  return (
    <div className="grow pl-2">
      <div className="pb-2">{data.note}</div>
      <Separator />
      <div className="pt-2 text-slate-400">{data.content.description}</div>
    </div>
  )
}

export default DetailNotes