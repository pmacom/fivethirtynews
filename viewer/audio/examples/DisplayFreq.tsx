import React from 'react'
import useAudioStore from '../store'

const DisplayFreq = () => {
  const low = useAudioStore(state => state.low)
  const mid = useAudioStore(state => state.mid)
  const high = useAudioStore(state => state.high)
  const amplitude = useAudioStore(state => state.amplitude)
  const rawAmplitude = useAudioStore(state => state.rawAmplitude)

  return (
    <div className="p-4 border-2 border-lime-500 fixed top-0 left-0 z-[1]">
      <div>Frequencies</div>
      <>
        <div>Low: {low}</div>
        <div>Mid: {mid}</div>
        <div>High: {high}</div>
        <div>Amp: {amplitude}</div>
        <div>RAmp: {rawAmplitude}</div>
      </>
    </div>
  )
}

export default DisplayFreq