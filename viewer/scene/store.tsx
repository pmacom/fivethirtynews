import { create } from "zustand";
import { CameraControls } from "@react-three/drei";
import * as THREE from 'three';
import { useContentStore } from '../core/store/contentStore';

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
    if(!camera || !activeItemObject) return

    // Debug logging to verify correct object is being framed
    console.log('fitToBox called:', {
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

