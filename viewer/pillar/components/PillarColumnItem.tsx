import { useEffect, useMemo, useRef } from "react"
import * as THREE from 'three'
import { LiveViewContentBlockItems } from "@/viewer/core/content/types"
import TemplateSwitcher from "../templates/TemplateSwitcher"

import { useContentStore } from '../../core/store/contentStore'
import { isMobile, isTablet, isDesktop } from "react-device-detect"
import { ThreeEvent } from '@react-three/fiber'

interface PillarColumnItemProps {
  data: LiveViewContentBlockItems
  position: [number, number, number]
  categoryId: string
  itemIndex: number
}
export const PillarColumnItem = ({ data, categoryId, itemIndex, position }:PillarColumnItemProps) => {
  const activeItemId = useContentStore(state => state.activeItemId)
  const setHoveredItem = useContentStore(state => state.setHoveredItem)
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
      useContentStore.setState({ activeItemData: data })
      // Note: activeItemObject is now set by PlaneView (the content plane)
    }
  }, [groupRef, content_id, activeItemId, data])

  const rotation = useMemo(() => {
    if (isMobile || isTablet) {
      return [0, 0, Math.PI / 2]; // Rotate 90 degrees around the X-axis
    }
    return [0, 0, 0]; // No rotation
  }, []);

  const handlePointerEnter = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHoveredItem(data)
  }

  const handlePointerLeave = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHoveredItem(null)
  }

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation as [number, number, number]}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {content}
    </group>
  )
}

export default PillarColumnItem