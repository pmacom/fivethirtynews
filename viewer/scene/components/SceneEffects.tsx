import React from 'react'
import { EffectComposer, DepthOfField } from '@react-three/postprocessing'
import { useControls } from 'leva'

function SceneEffects() {
  // const { focusDistance, focalLength, bokehScale, height, focusRange } = useControls('Depth of Field', {
  //   focusDistance: { value: 0.1, min: 0, max: 10, step: 0.1 },
  //   focalLength: { value: 0.1, min: 0, max: 1, step: 0.001 },
  //   bokehScale: { value: 10, min: 0, max: 10, step: 0.1 },
  //   height: { value: 480, min: 0, max: 1000, step: 1 },
  //   focusRange: { value: 0.01, min: 0, max: 1, step: 0.001 }
  // })

  return (
    <EffectComposer>
      <></>
      {/* <DepthOfField
        focusDistance={focusDistance}
        focalLength={focalLength}
        focusRange={focusRange}
        bokehScale={bokehScale}
        height={height}
      /> */}
    </EffectComposer>
  )
}

export default SceneEffects