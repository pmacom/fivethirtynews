"use client"

import React from 'react'
import '@react-three/fiber'
import { UI } from './ui/ui'
import AudioSettings from './audio/settings'
import Settings from './ui/settings/settings'
import Legend from './ui/legend/legend'
import BehaviorDetection from './common/BehaviorDetection'
import Scene from './scene/scene'
import AudioListener from './audio/listener'
import { Pillar } from './pillar/pillar'
import {SettingsOptions, CameraOptions, LevaOptions } from './ui/settings/options'
import Details from './ui/details/details'
import { Logo530 } from './models/Logo530'





export const Viewer = () => {
  

  return (
    // <BehaviorDetection>

      <Scene>
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="red" />
        </mesh>
        
        {/* <Pillar /> */}
        {/* <directionalLight position={[10, 10, 10]} intensity={1} />
        <Logo530 /> */}
      </Scene>

{/* 
      <UI>
        <Legend />
        <Details />
        <Settings>
          <SettingsOptions />
          <CameraOptions />
          <LevaOptions />
          <AudioSettings />
        </Settings>
      </UI>

      <AudioListener />

      

    </BehaviorDetection>
    */}
    
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