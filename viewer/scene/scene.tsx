'use client'

import React from 'react'
import '@react-three/fiber'
import { Canvas } from '@react-three/fiber'
import { SceneCamera } from './components/SceneCamera'
import { PerspectiveCamera } from '@react-three/drei'
import SceneListeners from './components/SceneListeners'
import useSettingStore from '../ui/settings/store'
import { Leva } from 'leva'
import SceneEffects from './components/SceneEffects'

interface SceneProps {
  children: React.ReactNode
}

function Scene({ children }: SceneProps) {
  const showLeva = useSettingStore(state => state.showLeva)

  return (
    <div className="w-screen h-screen bg-slate-900">
      <Canvas>
        <PerspectiveCamera position={[0, 0, 0]} />

        <SceneCamera />
        <SceneEffects />
        <SceneListeners />

        <ambientLight intensity={0.5} />

        {children}
      </Canvas>
      <Leva flat collapsed hidden={!showLeva} />
    </div>
  )
}


export default Scene
