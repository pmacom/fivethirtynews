"use client"

import React, { useRef, useState, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import BackgroundScene from './models/BackgroundScene'
import AudioResponsiveSphere from './models/AudioResponsiveSphere'
import Logo530 from './models/Logo530'
import { Pillar } from './pillar/pillar'
import Scene from './scene/scene'
import { UI } from './ui/ui'
import Legend from './ui/legend/legend'
import Details from './ui/details/details'
import Settings from './ui/settings/settings'
import SettingsOptions from './ui/settings/options'
import StageSelect from './ui/stageselect/StageSelect'
import SplashScreen from './ui/splash/SplashScreen'
import Chyron from './ui/chyron/chyron'
import ErrorBoundary from './ErrorBoundary'
import BehaviorDetection from './common/BehaviorDetection'
import { TunnelThing } from './scene/components/TunnelThing'
import './ui/splash/styles.css'

const Viewer = () => {


  return (
    <ErrorBoundary>
      <BehaviorDetection>
        <Scene>
          {/* <ambientLight intensity={Math.PI / 2} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
          <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} /> */}
          
          {/* <AudioResponsiveSphere /> */}
          <Suspense fallback={null}>
            <Pillar />
          </Suspense>
          
        </Scene>
        <UI>
          <Legend />
          <Details />
          <Settings>
            <SettingsOptions />
          </Settings>
        </UI>
        <Chyron />
        {/* Stage Select and Splash are always visible, not affected by mouse movement */}
        <StageSelect />
        <SplashScreen />
      </BehaviorDetection>
    </ErrorBoundary>
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