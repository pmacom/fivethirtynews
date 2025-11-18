import { create } from "zustand";
import { CameraControls } from "@react-three/drei";
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
    if(!canvasWidth || !canvasHeight || isAnimating) return
    if(!camera || !activeItemObject) return
    camera.fitToBox(activeItemObject, true)
  },
}))

