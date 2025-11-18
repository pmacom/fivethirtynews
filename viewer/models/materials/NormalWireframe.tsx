import React, { useRef } from 'react'
import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Define the material type, including uniforms like `time`
type CustomShaderMaterialType = THREE.ShaderMaterial & {
  time: number
}

declare global {
namespace JSX {
    interface IntrinsicElements {
    customShaderMaterial: any
    }
  }
}
// Create the shader material
const CustomShaderMaterial = shaderMaterial(
  {
    time: 0,
  },
  // Vertex shader
  `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  `,
  // Fragment shader
  `
  uniform float time;
  varying vec2 vUv;
  void main() {
    vec3 color = vec3(0.5 + 0.5 * sin(time + vUv.x * 10.0), 0.5 + 0.5 * cos(time + vUv.y * 10.0), 0.5);
    gl_FragColor = vec4(color, 1.0);
  }
  `
)

// Extend the material so that it can be used as a JSX element
extend({ CustomShaderMaterial })

export const NormalWireframe = () => {
    const materialRef = useRef<CustomShaderMaterialType>(null)

    useFrame((state, delta) => {
        if (materialRef.current) {
            materialRef.current.time += delta
        }
    })
    
    return <customShaderMaterial ref={materialRef} wireframe side={THREE.BackSide} />
}

export default CustomShaderMaterial



