import AudioStore from "@/wtf/Audio/audioStore"
import SettingStore from "@/wtf/Settings/settingsStore"
import { useFrame } from '@react-three/fiber'
import React from 'react'

export const SceneListeners = () => {
  const isAudioReactivityEnabled = SettingStore.get('isAudioReactivityEnabled')

  useFrame(() => {
    if(!isAudioReactivityEnabled) return
    AudioStore.set('updateFrequencies')
  })

  return <></>
}

export default SceneListeners