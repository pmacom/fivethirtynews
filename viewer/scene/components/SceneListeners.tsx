import useAudioStore from '@/viewer/audio/store'
import useSettingStore from '@/viewer/ui/settings/store'
import { useFrame } from '@react-three/fiber'
import React from 'react'

export const SceneListeners = () => {
  const isAudioReactivityEnabled = useSettingStore(state => state.isAudioReactivityEnabled)
  const updateFrequencies = useAudioStore(state => state.updateFrequencies)

  useFrame(() => {
    if(!isAudioReactivityEnabled) return
    updateFrequencies()
  })

  return <></>
}

export default SceneListeners