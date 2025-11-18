import React, { useEffect, useRef } from 'react'
import { CameraControls } from '@react-three/drei'
import { useControls } from 'leva'
import CameraControlsLib from 'camera-controls' // Import ACTION from camera-controls
import { useSceneStore } from '../store'
import useSettingStore from '../../ui/settings/store'

export const SceneCamera = () => {
  const camRef = useRef<CameraControls | null>(null)
  const freelook = useSettingStore(state => state.isFreeLook)

  useEffect(() => {
    if (camRef.current) useSceneStore.setState({ camera: camRef.current });
  }, [camRef])

  return (
    <CameraControls
      makeDefault
      ref={camRef}
      mouseButtons={{
        left: freelook ? CameraControlsLib.ACTION.ROTATE : CameraControlsLib.ACTION.NONE,   // Enable/Disable rotate
        middle: freelook ? CameraControlsLib.ACTION.DOLLY : CameraControlsLib.ACTION.NONE,  // Enable/Disable zoom
        right: freelook ? CameraControlsLib.ACTION.TRUCK : CameraControlsLib.ACTION.NONE,   // Enable/Disable pan
        wheel: freelook ? CameraControlsLib.ACTION.DOLLY : CameraControlsLib.ACTION.NONE    // Enable/Disable zoom with mouse wheel
      }}
      touches={{
        one: freelook ? CameraControlsLib.ACTION.TOUCH_ROTATE : CameraControlsLib.ACTION.NONE,   // Single touch for rotation
        two: freelook ? CameraControlsLib.ACTION.TOUCH_DOLLY_TRUCK : CameraControlsLib.ACTION.NONE,  // Two-finger touch for zoom and pan
        three: CameraControlsLib.ACTION.NONE // No action for three-finger touch
      }}
      dollyToCursor={false}  // Disable zooming on scroll
    />
  )
}

export default SceneCamera