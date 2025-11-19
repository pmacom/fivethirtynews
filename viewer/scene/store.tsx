import { create } from "zustand";
import { CameraControls } from "@react-three/drei";
import * as THREE from 'three';
import { useContentStore } from '../core/store/contentStore';
import logger from '../utils/logger';

interface SceneStoreState {
  camera: CameraControls | null
  canvasWidth: number
  canvasHeight: number
  fitToBox: (ignore?: boolean) => void
}

export const useSceneStore = create<SceneStoreState>()((set, get) => ({
  camera: null,
  canvasWidth: 0,
  canvasHeight: 0,

  fitToBox: (ignore?: boolean) => {
    const { canvasWidth, canvasHeight, camera } = get()
    const isAnimating = useContentStore.getState().isAnimating
    const activeItemObject = useContentStore.getState().activeItemObject
    const activeItemId = useContentStore.getState().activeItemId

    if(!canvasWidth || !canvasHeight || isAnimating) return

    // Error logging for missing dependencies
    if(!camera || !activeItemObject) {
      logger.error('fitToBox failed - missing dependencies', {
        hasCamera: !!camera,
        hasActiveItemObject: !!activeItemObject,
        activeItemId,
        canvasSize: [canvasWidth, canvasHeight],
        isAnimating,
        timestamp: Date.now()
      })
      return
    }

    // Debug logging to verify correct object is being framed
    logger.debug('fitToBox called:', {
      activeItemId,
      objectUuid: activeItemObject.uuid,
      localPosition: activeItemObject.position.toArray(),
      worldPosition: activeItemObject.getWorldPosition(new THREE.Vector3()).toArray()
    })

    // Small padding to prevent edge cases with camera positioning
    // Relies on CameraControls' native fitToBox math
    camera.fitToBox(activeItemObject, true, { paddingTop: 0.03, paddingBottom: 0.03, paddingLeft: 0.03, paddingRight: 0.03 })
  },
}))

