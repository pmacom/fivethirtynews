import { createStore } from "zustand-x";
import { CameraControls } from "@react-three/drei";
import { ContentStore } from "../Content/contentStore";

interface SceneStoreState {
  camera: CameraControls | null
  canvasWidth: number
  canvasHeight: number
}

export const SceneStore = createStore<SceneStoreState>({
  camera: null,
  canvasWidth: 0,
  canvasHeight: 0
}, {
  name: 'wtf-scene-store'
}).extendActions(({ set, get })=>({


  fitToBox: (ignore?: boolean) => {
    const width = get('canvasWidth')
    const height = get('canvasHeight')
    const cam = get('camera')
    const isAnimating = ContentStore.get('isAnimating')
    const activeItemObject = ContentStore.get('activeItemObject')
    if(!width || !height || isAnimating) return
    if(!cam || !activeItemObject) return
    cam.fitToBox(activeItemObject, true)
  },

}))

