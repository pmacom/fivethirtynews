import { useEffect } from "react"
import AudioStore from './audioStore'
import SettingStore from "../Settings/settingsStore"
import { useStoreValue } from 'zustand-x'

export const AudioListener = () => {
  const isAudioReactivityEnabled = useStoreValue(SettingStore, 'isAudioReactivityEnabled')
  const isAnalyserReady = useStoreValue(AudioStore, 'isAnalyserReady')


  useEffect(() => {
    if (isAudioReactivityEnabled) {
      AudioStore.set('listAudioDevices')
    }
  }, [isAudioReactivityEnabled])

  useEffect(() => {
    if (isAudioReactivityEnabled) {
      AudioStore.set('setupAudio')
    }
  }, [isAudioReactivityEnabled])

  useEffect(() => {
    if (!isAnalyserReady || !isAudioReactivityEnabled) return

    const interval = setInterval(() => {
      AudioStore.set('updateFrequencies')
    }, 1000 / 60) // 60 times per second

    return () => clearInterval(interval)
  }, [isAnalyserReady, isAudioReactivityEnabled])

  return <></>
}

export default AudioListener
