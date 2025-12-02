import { DisplayStore } from "@/wtf/display/cameraStore"
import { RapierRigidBody, RigidBody } from "@react-three/rapier"
import { useRef } from "react"
import { PositionStore } from "../positionStore"
import { useStoreValue } from 'zustand-x'

interface PhysicsWrapperProps {
  index: number
  children: React.ReactNode
}

export const PhysicsWrapper = ({ index, children }: PhysicsWrapperProps) => {
  const rigidBody = useRef<RapierRigidBody>(null)
  const transforms = useStoreValue(PositionStore, 'transforms')
  const { position, rotation } = transforms[index]

  return (
    <RigidBody
      ref={rigidBody}
      colliders={"trimesh"}
      // colliders={"ball"}
      restitution={-2}
      // position={position}
      // rotation={rotation}
      angularDamping={0.5}
    >
      {children}
    </RigidBody>
  )
}