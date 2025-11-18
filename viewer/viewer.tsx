"use client"

import React, { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import BackgroundScene from './models/BackgroundScene'
import AudioResponsiveSphere from './models/AudioResponsiveSphere'
import Logo530 from './models/Logo530'
import { OrbitControls } from '@react-three/drei'
import { UI } from './ui/ui'
import Legend from './ui/legend/legend'
import Details from './ui/details/details'
import Settings from './ui/settings/settings'
import SettingsOptions from './ui/settings/options'

const Viewer = () => {


  return (
    <div className="w-screen h-screen bg-black">
      <Canvas>
        <ambientLight intensity={Math.PI / 2} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
        <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
        {/* <BackgroundScene /> */}
        {/* <AudioResponsiveSphere /> */}
        <Logo530 />
        <OrbitControls makeDefault />
      </Canvas>
      <UI>
        <Legend />
        <Details />
        <Settings>
          <SettingsOptions />
        </Settings>
      </UI>

    </div>
  )
}

export default Viewer


/*

      <Scene>
        
        <BackgroundScene />
        <AudioResponsiveSphere />
      
        <Pillar />

        <Logo530 />
        <OrbitControls />
      </Scene>

      */