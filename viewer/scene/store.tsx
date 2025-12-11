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
  focusOnContent: () => Promise<void>
}

/**
 * Estimate optimal camera distance based on object size and FOV
 */
function estimateCameraDistance(object: THREE.Object3D, fovDegrees: number = 75): number {
  const box = new THREE.Box3().setFromObject(object)
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y)

  // Distance = size / (2 * tan(FOV/2)) with 30% margin for padding
  const fovRad = fovDegrees * (Math.PI / 180)
  return (maxDim / 2) / Math.tan(fovRad / 2) * 1.3
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

    // Early return if dependencies not ready (expected during initial load)
    if(!camera || !activeItemObject) {
      // Only log at debug level - this is expected when no item is selected yet
      if (activeItemId) {
        // Only warn if we have an activeItemId but no object (unexpected)
        logger.debug('fitToBox waiting for activeItemObject', { activeItemId })
      }
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

  /**
   * Focus camera on active content by positioning it in front of the plane.
   * 1. Calculate plane's world position and normal (forward direction)
   * 2. Position camera along that normal at optimal viewing distance
   * 3. Animate camera to face content, then fine-tune with fitToBox
   */
  focusOnContent: async () => {
    const { canvasWidth, canvasHeight, camera } = get()
    const isAnimating = useContentStore.getState().isAnimating
    const activeItemObject = useContentStore.getState().activeItemObject
    const activeItemId = useContentStore.getState().activeItemId

    if (!canvasWidth || !canvasHeight || isAnimating) return

    if (!camera || !activeItemObject) {
      logger.error('focusOnContent failed - missing dependencies', {
        hasCamera: !!camera,
        hasActiveItemObject: !!activeItemObject,
        activeItemId,
        timestamp: Date.now()
      })
      return
    }

    try {
      // Get world transform of the content plane
      const worldPos = new THREE.Vector3()
      const worldQuat = new THREE.Quaternion()
      activeItemObject.getWorldPosition(worldPos)
      activeItemObject.getWorldQuaternion(worldQuat)

      // Plane faces +Z in local space, transform to world normal
      const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(worldQuat)

      // Estimate optimal camera distance based on object size
      const distance = estimateCameraDistance(activeItemObject)

      // Camera position = plane center + normal * distance
      const cameraPos = worldPos.clone().addScaledVector(normal, distance)

      logger.debug('focusOnContent:', {
        activeItemId,
        worldPos: worldPos.toArray(),
        normal: normal.toArray(),
        distance,
        cameraPos: cameraPos.toArray()
      })

      // Smoothly animate camera to position facing the content
      await camera.setLookAt(
        cameraPos.x, cameraPos.y, cameraPos.z,
        worldPos.x, worldPos.y, worldPos.z,
        true // smooth transition
      )

      // Fine-tune framing with fitToBox for precise padding
      camera.fitToBox(activeItemObject, true, {
        paddingTop: 0.03,
        paddingBottom: 0.03,
        paddingLeft: 0.03,
        paddingRight: 0.03,
      })
    } catch (error) {
      logger.error('focusOnContent error, falling back to fitToBox:', error)
      // Fallback to basic fitToBox if something goes wrong
      camera.fitToBox(activeItemObject, true, {
        paddingTop: 0.03,
        paddingBottom: 0.03,
        paddingLeft: 0.03,
        paddingRight: 0.03,
      })
    }
  },
}))

