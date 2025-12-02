import React, { useRef } from 'react'
import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { NormalWireframe } from './materials/NormalWireframe'

export const Web = () => {
  return (
    <mesh scale={5}>
      <sphereGeometry args={[1, 32, 32]} />
      <NormalWireframe />
    </mesh>
  )
}
