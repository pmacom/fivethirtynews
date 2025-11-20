import * as THREE from 'three'
import React, { useMemo } from 'react'
import { Environment, Float, useGLTF, shaderMaterial, MeshReflectorMaterial } from '@react-three/drei'
import { GLTF } from 'three-stdlib'
import { useControls } from 'leva'
import { useFrame, extend } from '@react-three/fiber'
import { NormalWireframe } from './materials/NormalWireframe'
import { Web2 } from './Web2'
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

interface Logo532Props {
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

export const Logo532 = (props: Logo532Props) => {
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
            <MeshReflectorMaterial
              blur={[200, 200]}
              resolution={512}
              mixBlur={1}
              mixStrength={.5}
              depthScale={1}
              minDepthThreshold={0.85}
              color="#666666"
              metalness={0.0}
              roughness={.0}
              side={THREE.BackSide}
            />
          </mesh>

          <mesh
            name="Numbers"
            geometry={nodes.Numbers.geometry}
          >
            <MeshReflectorMaterial
              blur={[200, 200]}
              resolution={512}
              mixBlur={1}
              mixStrength={.5}
              depthScale={1}
              minDepthThreshold={0.85}
              color="#777"
              metalness={0.0}
              roughness={.0}
              side={THREE.BackSide}
            />
          </mesh>

          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[10, 32, 32]} />
            <MeshReflectorMaterial
              blur={[200, 200]}
              resolution={512}
              mixBlur={1}
              mixStrength={.5}
              depthScale={1}
              minDepthThreshold={0.85}
              color="#555555"
              metalness={0.0}
              roughness={.0}
              side={THREE.BackSide}
            />
          </mesh>
        </Float>

<Web2 />
      
      </group>

    </group>
  )
}

export default Logo532

useGLTF.preload('/colorLogo1.glb')
