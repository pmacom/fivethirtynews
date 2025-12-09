'use client'

import React from 'react'
import '@react-three/fiber'
import { Canvas } from '@react-three/fiber'
import { SceneCamera } from './components/SceneCamera'
import { PerspectiveCamera, ScreenSpace } from '@react-three/drei'
import SceneListeners from './components/SceneListeners'
import useSettingStore from '../ui/settings/store'
import { useBrowseModeStore } from '../core/store/browseModeStore'
import { Leva } from 'leva'
import SceneEffects from './components/SceneEffects'
import { TunnelThing } from './components/TunnelThing'
import { BackgroundScene } from '@/viewer/models/BackgroundScene'

interface SceneProps {
  children: React.ReactNode
}

function Scene({ children }: SceneProps) {
  const showLeva = useSettingStore(state => state.showLeva)
  const isBrowseMode = useBrowseModeStore(state => state.isActive)

  return (
    <div className={`w-screen h-screen bg-slate-900 ${isBrowseMode ? 'ring-4 ring-inset ring-orange-500' : ''}`}>
      <Canvas gl={{ localClippingEnabled: true }}>
        <PerspectiveCamera position={[0, 0, 0]} />

        <SceneCamera />
        <SceneEffects />
        <SceneListeners />
        
        <BackgroundScene />

        <ambientLight intensity={0.5} />

        {children}
      </Canvas>
      {showLeva && <Leva flat collapsed />}
    </div>
  )
}


export default Scene
