import React from 'react'
import { Canvas } from '@react-three/fiber'
import { SceneCamera } from './components/SceneCamera'
import { PerspectiveCamera } from '@react-three/drei'
import { Perf } from 'r3f-perf'
import SceneListeners from './components/SceneListeners'
import SettingStore from "../Settings/settingsStore"
import { Leva } from 'leva'
import SceneEffects from './components/SceneEffects'
import { useStoreValue } from 'zustand-x'

interface SceneProps {
  children: React.ReactNode
}

const showPerf = false
function Scene({ children }: SceneProps) {
  const showLeva = useStoreValue(SettingStore, 'showLeva')

  return (
    <div className="w-screen h-screen bg-slate-900">
      <Canvas>
        <PerspectiveCamera position={[0, 0, 0]} />
        
        <SceneCamera />
        <SceneEffects />
        <SceneListeners />

        
        <ambientLight intensity={0.5} />
        
        {showPerf && <Perf />}
        
        {children}
      </Canvas>
      <Leva flat collapsed hidden={!showLeva} />
    </div>
  )
}


export default Scene
