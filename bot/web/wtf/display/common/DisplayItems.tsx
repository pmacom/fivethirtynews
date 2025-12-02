import { useCallback, useMemo, useRef } from "react"
import { Group, Mesh, Vector3 } from "three"
import DisplayStore from "../cameraStore"
import { LiveViewContent } from "@/wtf/Content/types"
import { PhysicsWrapper } from "./PhysicsWrapper"
import { ThreeEvent } from "@react-three/fiber"
import * as THREE from "three"
import { DisplayContentTransform } from "../../Content/types"
import { Helper, Text } from "@react-three/drei"
import { SceneStore } from "@/wtf/Scene/sceneStore"
import SpatialDataStore from "../positionStore"
import { useSpring, animated } from '@react-spring/three'  // Note: Changed to @react-spring/three
import DisplayCameraStore from "../cameraStore"
import { useStoreValue } from 'zustand-x'

interface DisplayItemsProps {
  content: LiveViewContent[]
}

export const DisplayItems = ({ content }: DisplayItemsProps) => {
  return content.map((item, index) => (
    <DisplayItem key={`content-${index}`} item={item} index={index} />
  ))
}

interface DisplayItemProps {
  item: LiveViewContent
  index: number
}

export const DisplayItem = ({ item, index }: DisplayItemProps) => {
  // Explicitly type the contentTemplate selector
  const managed = useStoreValue(DisplayStore, 'managed')
  const contentTemplate = useStoreValue(DisplayStore, 'contentTemplate')
  const groupRef = useRef<Group>(null)

  const transforms = useStoreValue(SpatialDataStore, 'transforms')
  const { position, rotation } = transforms[index] || { position: [0, 0, 0], rotation: [0, 0, 0] }

  const ContentTemplate = contentTemplate // Assign to PascalCase variable for JSX usage
  const [width, height] = useStoreValue(DisplayStore, 'screenAspectRatio')
  const camera = useStoreValue(SceneStore, 'camera')
  
  // Create animated values for position and rotation
  const springs = useSpring({
    position,
    rotation,
    config: { mass: 1, tension: 170, friction: 26 }
  })

  const onItemClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if(!groupRef.current || !camera) return
    const rect = new Mesh(new THREE.BoxGeometry(width, height, 0.01), new THREE.MeshBasicMaterial({ color: 'red' }))
    rect.position.set(position[0], position[1], position[2])
    rect.rotation.set(rotation[0], rotation[1], rotation[2])
    DisplayCameraStore.set('fitToRect', rect, camera)
  }, [width, height, camera, position, rotation])

  // Verify contentTemplate exists before rendering
  if (!contentTemplate) {
    console.error('ContentTemplate is undefined')
    return null
  }

  const debug = false
  return (
    <animated.group
      ref={groupRef}
      key={`content-${index}`}
      onClick={onItemClick}
      position={springs.position}
      // @ts-expect-error - react-spring types don't match three.js types
      rotation={springs.rotation}
    >
      {debug && <Helper type={THREE.BoxHelper} args={['royalblue']} />}
      {managed ? (
        <ContentTemplate
          itemIndex={index}
          content={item}
        />
      ) : (
        <PhysicsWrapper index={index}>
          <ContentTemplate
            itemIndex={index}
            content={item}
          />
        </PhysicsWrapper>
      )}
    </animated.group>
  )
}