import Logo530 from "@/viewer/models/Logo530"
import { Environment, MeshReflectorMaterial, ScreenSpace } from "@react-three/drei"
import * as THREE from 'three'

export const TunnelThing = () => {
  return (
    <ScreenSpace depth={4}>
      <mesh position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <sphereGeometry args={[20, 32, 32]} />
      <MeshReflectorMaterial
        blur={[400, 100]}
        resolution={1024}
        mixBlur={1}
        mixStrength={15}
        depthScale={1}
        minDepthThreshold={0.85}
        color="#151515"
        metalness={0.6}
        roughness={1}
        side={THREE.BackSide}
      />
    </mesh>
    {/* <Environment preset="sunset" /> */}
    {/* <Logo530 /> */}
  </ScreenSpace>
  )
}