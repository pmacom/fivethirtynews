import React, { useEffect, useRef, useCallback } from 'react'
import { CameraControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import CameraControlsLib from 'camera-controls'
import * as THREE from 'three'
import { useSceneStore } from '../store'
import useSettingStore from '../../ui/settings/store'
import { useViewModeStore, VIEW_MODE_CONFIG } from '../../core/store/viewModeStore'
import { useBrowseModeStore } from '../../core/store/browseModeStore'
import { WASDControls } from './WASDControls'

export const SceneCamera = () => {
  const camRef = useRef<CameraControls | null>(null)
  const prevViewModeRef = useRef<string | null>(null)
  const { camera } = useThree()
  const freelook = useSettingStore(state => state.isFreeLook)
  const viewMode = useViewModeStore(state => state.viewMode)

  // Browse mode state
  const isBrowseMode = useBrowseModeStore(state => state.isActive)
  const browseControlType = useBrowseModeStore(state => state.controlType)
  const savedCameraState = useBrowseModeStore(state => state.savedCameraState)

  // Get per-view orbit control config
  const viewConfig = VIEW_MODE_CONFIG[viewMode]
  // Only enable orbit controls if BOTH global freelook AND per-view config allow it
  const enableOrbit = freelook && viewConfig.enableOrbitControls

  // In browse mode with orbit controls, enable full orbit
  // Note: 'pillar-camera' and 'static' modes use custom camera control, not orbit controls
  const enableBrowseOrbit = isBrowseMode && browseControlType === 'orbit'

  // Determine if orbit controls should be active
  // pillar-camera and static modes deliberately keep orbit controls disabled
  const orbitEnabled = enableOrbit || enableBrowseOrbit

  useEffect(() => {
    if (camRef.current) useSceneStore.setState({ camera: camRef.current })
  }, [camRef])

  // Save camera state when entering browse mode
  const saveCameraState = useCallback(() => {
    if (!camRef.current) return null

    const position = new THREE.Vector3()
    const target = new THREE.Vector3()

    camRef.current.getPosition(position)
    camRef.current.getTarget(target)

    return {
      position: [position.x, position.y, position.z] as [number, number, number],
      target: [target.x, target.y, target.z] as [number, number, number],
      zoom: camera.zoom,
    }
  }, [camera])

  // Restore camera state when exiting browse mode
  const restoreCameraState = useCallback(async () => {
    if (!camRef.current || !savedCameraState) return

    const { position, target } = savedCameraState

    await camRef.current.setLookAt(
      position[0], position[1], position[2],
      target[0], target[1], target[2],
      true // smooth transition
    )
  }, [savedCameraState])

  // Auto-enter browse mode when switching to cloud or stack view
  useEffect(() => {
    // Skip on initial mount (prevViewModeRef is null)
    if (prevViewModeRef.current === null) {
      prevViewModeRef.current = viewMode
      return
    }

    const autoEnterBrowseModes: Array<typeof viewMode> = ['cloud', 'stack']
    const shouldAutoEnter = autoEnterBrowseModes.includes(viewMode) && prevViewModeRef.current !== viewMode

    if (shouldAutoEnter) {
      const { isActive, enterBrowseMode } = useBrowseModeStore.getState()
      if (!isActive) {
        const cameraState = saveCameraState()
        if (cameraState) {
          enterBrowseMode(VIEW_MODE_CONFIG[viewMode].browseControlType, cameraState)
        }
      }
    }
    prevViewModeRef.current = viewMode
  }, [viewMode, saveCameraState])

  // Handle Tab key to toggle browse mode
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault()

        const { isActive, enterBrowseMode } = useBrowseModeStore.getState()

        if (isActive) {
          // Exit browse mode and restore camera
          useBrowseModeStore.setState({ isActive: false })
          await restoreCameraState()
        } else {
          // Enter browse mode - save camera state first
          const cameraState = saveCameraState()
          if (cameraState) {
            enterBrowseMode(viewConfig.browseControlType, cameraState)
          }
        }
      }

      // Esc also exits browse mode and restores camera
      if (e.key === 'Escape' && isBrowseMode) {
        e.preventDefault()
        useBrowseModeStore.setState({ isActive: false })
        await restoreCameraState()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isBrowseMode, saveCameraState, restoreCameraState, viewConfig.browseControlType])

  return (
    <>
      {/* Main camera controls - always present but conditionally enabled */}
      <CameraControls
        makeDefault
        ref={camRef}
        mouseButtons={{
          left: orbitEnabled ? CameraControlsLib.ACTION.ROTATE : CameraControlsLib.ACTION.NONE,
          middle: orbitEnabled ? CameraControlsLib.ACTION.DOLLY : CameraControlsLib.ACTION.NONE,
          right: orbitEnabled ? CameraControlsLib.ACTION.TRUCK : CameraControlsLib.ACTION.NONE,
          wheel: orbitEnabled ? CameraControlsLib.ACTION.DOLLY : CameraControlsLib.ACTION.NONE,
        }}
        touches={{
          one: orbitEnabled ? CameraControlsLib.ACTION.TOUCH_ROTATE : CameraControlsLib.ACTION.NONE,
          two: orbitEnabled ? CameraControlsLib.ACTION.TOUCH_DOLLY_TRUCK : CameraControlsLib.ACTION.NONE,
          three: CameraControlsLib.ACTION.NONE,
        }}
        dollyToCursor={false}
      />

      {/* WASD controls - only active in browse mode with wasd control type */}
      {isBrowseMode && browseControlType === 'wasd' && <WASDControls />}
    </>
  )
}

export default SceneCamera