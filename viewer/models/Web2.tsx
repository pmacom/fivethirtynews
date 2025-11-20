import React, { useRef } from 'react'
import { Float, MeshReflectorMaterial, shaderMaterial } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { NormalWireframe } from './materials/NormalWireframe'

export const Web2 = () => {
  return (
    <Float>
    <group rotation={[Math.PI/2, 0, 0]} position={[0, -2, 0]}>
    <mesh scale={2}>
      <planeGeometry args={[50, 50, 100, 100]} />
      <MeshReflectorMaterial
        blur={[400, 100]}
        resolution={1024}
        mixBlur={1}
        mixStrength={15}
        depthScale={1}
        minDepthThreshold={0.85}
        color="#FFFFFF"
        metalness={0.6}
        roughness={1}
        side={THREE.BackSide}
        wireframe={true}
      />
    </mesh>
    </group>
    </Float>
  )
}
