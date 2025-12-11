import { useCallback, useEffect, useRef, useState, ReactNode } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useContentStore } from '../../core/store/contentStore'
import { LiveViewContentBlockItems } from '../../core/content/types'

interface ContentWrapperProps {
  item: LiveViewContentBlockItems
  categoryId: string
  itemIndex: number
  active: boolean
  children: ReactNode
}

export const ContentWrapper = ({
  item,
  categoryId,
  itemIndex,
  active,
  children
}: ContentWrapperProps) => {
  const { size: { width, height } } = useThree()
  const groupRef = useRef<THREE.Group>(null)
  const [screenAspect, setScreenAspect] = useState<[number, number]>([1, 1])

  // Calculate viewport-based plane size (no gaps)
  useEffect(() => {
    const planeHeight = 1.0 // Fill the 1-unit spacing exactly
    const viewportAspect = width / height
    const planeWidth = planeHeight * viewportAspect
    setScreenAspect([planeWidth, planeHeight])
  }, [width, height])

  // Set activeItemData when this item becomes active
  // Note: activeItemObject is now set by PlaneView (the content plane)
  useEffect(() => {
    if (active) {
      useContentStore.setState({ activeItemData: item })
    }
  }, [active, item])

  // Handle click to set this item as active
  const onClick = useCallback(() => {
    useContentStore.setState({
      activeCategoryId: categoryId,
      activeItemId: item.content?.id,
      activeItemIndex: itemIndex,
    })
  }, [categoryId, item.content?.id, itemIndex])

  return (
    <group ref={groupRef} onClick={onClick}>
      {/* Viewport-sized background plane for click target */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[screenAspect[0], screenAspect[1]]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Content plane positioned slightly forward */}
      <group position={[0, 0, 0.001]}>
        {children}
      </group>
    </group>
  )
}

export default ContentWrapper
