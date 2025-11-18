import * as THREE from 'three'
import React, { useMemo } from 'react'
import { Environment, Float, useGLTF, shaderMaterial } from '@react-three/drei'
import { GLTF } from 'three-stdlib'
import { useControls } from 'leva'
import { useFrame, extend } from '@react-three/fiber'
import { NormalWireframe } from './materials/NormalWireframe'
import { Web } from './Web'

interface GLTFAction extends THREE.AnimationClip {
  name: string
}

type GLTFResult = GLTF & {
  nodes: {
    NumberFrame: THREE.Mesh
    Numbers: THREE.Mesh,
    Roundcube: THREE.Mesh
  }
  materials: {
    NumbersFrame: THREE.MeshStandardMaterial
    Numbers: THREE.MeshStandardMaterial
  }
  animations: GLTFAction[]
}

interface Logo530Props {
  edgeMaterial?: THREE.Material
  surfaceMaterial?: THREE.Material
  children?: React.ReactNode
}

const CustomShaderMaterial = shaderMaterial(
  {
    roughness: 0.5,
    metalness: 0.5,
    opacity: 1.0,
  },
  `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  `,
  `
  uniform float roughness;
  uniform float metalness;
  uniform float opacity;

  varying vec2 vUv;

  void main() {
    vec3 color = vec3(0.5, 0.5, 0.5);
    gl_FragColor = vec4(color * roughness, opacity);
  }
  `
);

const WireframeMaterial = shaderMaterial(
  {},
  `
  varying vec3 vNormal;
  void main() {
    vNormal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  `,
  `
  varying vec3 vNormal;
  void main() {
    float edge = step(0.98, abs(dot(vNormal, vec3(0.0, 0.0, 1.0))));
    gl_FragColor = vec4(vec3(edge), 1.0);
  }
  `
);

extend({ CustomShaderMaterial, WireframeMaterial });

export const Logo530 = (props: Logo530Props) => {
  const { nodes, materials } = useGLTF('/models/colorLogo1.glb') as unknown as GLTFResult

  return (
    <group {...props} dispose={null} position={[0, 0, 0]}
      scale={.8}
      rotation={[Math.PI/2, 0, 0]}
    >
      <group name="Scene" rotation={[0, -Math.PI/2, Math.PI/2]}>
        <Float>
          <mesh
            name="NumberFrame"
            geometry={nodes.NumberFrame.geometry}
          >
            <NormalWireframe />
          </mesh>

          <mesh
            name="Numbers"
            geometry={nodes.Numbers.geometry}
          >
            <NormalWireframe />
          </mesh>
        </Float>

        <Web />
      </group>

    </group>
  )
}

export default Logo530

useGLTF.preload('/colorLogo1.glb')
