import { useEffect, useMemo, useRef } from "react"
import * as THREE from 'three'
import { LiveViewContentBlockItems } from "@/wtf/Content/types"
import TemplateSwitcher from "./TemplateSwitcher"

import { ContentStore } from "../../Content/contentStore"
import { isMobile, isTablet, isDesktop } from "react-device-detect"
import { useStoreValue } from 'zustand-x'

interface PillarColumnItemProps {
  data: LiveViewContentBlockItems
  position: [number, number, number]
  categoryId: string
  itemIndex: number
}
export const PillarColumnItem = ({ data, categoryId, itemIndex, position }:PillarColumnItemProps) => {
  const activeItemId = useStoreValue(ContentStore, 'activeItemId')
  const content_id = useMemo(() => data.content.content_id, [data])
  const contentType = useMemo(() => data.content?.content_type, [data])
  const groupRef = useRef<THREE.Group>(null)

  const content = useMemo(() => (
    TemplateSwitcher({
      data,
      categoryId,
      activeItemId,
      contentType,
      itemIndex
    })
  ),[data, categoryId, activeItemId, contentType, itemIndex])

  useEffect(() => {
    if(content_id == activeItemId && groupRef.current ){
      ContentStore.set('activeItemData', data)
      ContentStore.set('activeItemObject', groupRef.current)
    }
  }, [groupRef, content_id, activeItemId, data])

  const rotation = useMemo(() => {
    if (isMobile || isTablet) {
      return [0, 0, Math.PI / 2]; // Rotate 90 degrees around the X-axis
    }
    return [0, 0, 0]; // No rotation
  }, []);

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation as [number, number, number]}
    >
      {content}
    </group>
  )
}

export default PillarColumnItem