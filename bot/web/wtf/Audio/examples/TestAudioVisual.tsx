import React, { useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { AudioStore } from "../audioStore"
import { useStoreValue } from 'zustand-x'

function TestAudioVisual() {
  return (
    <div className="fixed top-0 left-0 w-screen h-screen bg-slate-800">
    <Canvas>
      <SimpleBarAudioTest />
    </Canvas>
    </div>
  )
}

export const SimpleBarAudioTest = () => {
  const low = useStoreValue(AudioStore, 'low')
  const mid = useStoreValue(AudioStore, 'mid')
  const high = useStoreValue(AudioStore, 'high')

  useFrame(() => {
    AudioStore.set('updateFrequencies')
  })

  return (
    <group>

      <mesh position={[-1, low, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="red" />
      </mesh>

      <mesh position={[0, mid, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="green" />
      </mesh>

      <mesh position={[1, high, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="blue" />
      </mesh>

    </group>
  )
}

export default TestAudioVisual