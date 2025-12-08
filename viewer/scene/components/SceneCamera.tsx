import React, { useEffect, useRef } from 'react'
import { CameraControls } from '@react-three/drei'
import { useControls } from 'leva'
import CameraControlsLib from 'camera-controls' // Import ACTION from camera-controls
import { useSceneStore } from '../store'
import useSettingStore from '../../ui/settings/store'
import { useViewModeStore, VIEW_MODE_CONFIG } from '../../core/store/viewModeStore'
import { BackgroundScene } from '@/viewer/models/BackgroundScene'
import { TunnelThing } from './TunnelThing'

export const SceneCamera = () => {
  const camRef = useRef<CameraControls | null>(null)
  const freelook = useSettingStore(state => state.isFreeLook)
  const viewMode = useViewModeStore(state => state.viewMode)

  // Get per-view orbit control config
  const viewConfig = VIEW_MODE_CONFIG[viewMode]
  // Only enable orbit controls if BOTH global freelook AND per-view config allow it
  const enableOrbit = freelook && viewConfig.enableOrbitControls

  useEffect(() => {
    if (camRef.current) useSceneStore.setState({ camera: camRef.current });
  }, [camRef])

  return (
    <CameraControls
      makeDefault
      ref={camRef}
      mouseButtons={{
        left: enableOrbit ? CameraControlsLib.ACTION.ROTATE : CameraControlsLib.ACTION.NONE,   // Enable/Disable rotate
        middle: enableOrbit ? CameraControlsLib.ACTION.DOLLY : CameraControlsLib.ACTION.NONE,  // Enable/Disable zoom
        right: enableOrbit ? CameraControlsLib.ACTION.TRUCK : CameraControlsLib.ACTION.NONE,   // Enable/Disable pan
        wheel: enableOrbit ? CameraControlsLib.ACTION.DOLLY : CameraControlsLib.ACTION.NONE    // Enable/Disable zoom with mouse wheel
      }}
      touches={{
        one: enableOrbit ? CameraControlsLib.ACTION.TOUCH_ROTATE : CameraControlsLib.ACTION.NONE,   // Single touch for rotation
        two: enableOrbit ? CameraControlsLib.ACTION.TOUCH_DOLLY_TRUCK : CameraControlsLib.ACTION.NONE,  // Two-finger touch for zoom and pan
        three: CameraControlsLib.ACTION.NONE // No action for three-finger touch
      }}
      dollyToCursor={false}  // Disable zooming on scroll
    />
  )
}

export default SceneCamera