import { useEffect } from "react"
import useAudioStore from "./store"
import useSettingStore from "../ui/settings/store"

export const AudioListener = () => {
  const isAudioReactivityEnabled = useSettingStore(state => state.isAudioReactivityEnabled)
  const isAnalyserReady = useAudioStore(state => state.isAnalyserReady)
  const listAudioDevices = useAudioStore(state => state.listAudioDevices)
  const setupAudio = useAudioStore(state => state.setupAudio)
  const updateFrequencies = useAudioStore(state => state.updateFrequencies)


  useEffect(() => {
    if (isAudioReactivityEnabled) {
      listAudioDevices()
    }
  }, [isAudioReactivityEnabled, listAudioDevices])

  useEffect(() => {
    if (isAudioReactivityEnabled) {
      setupAudio()
    }
  }, [isAudioReactivityEnabled, setupAudio])

  useEffect(() => {
    if (!isAnalyserReady || !isAudioReactivityEnabled) return

    const interval = setInterval(() => {
      updateFrequencies()
    }, 1000 / 60) // 60 times per second

    return () => clearInterval(interval)
  }, [isAnalyserReady, isAudioReactivityEnabled, updateFrequencies])

  return <></>
}

export default AudioListener
