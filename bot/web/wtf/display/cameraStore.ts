import { createStore } from "zustand-x";
import { DisplayContentTransform } from "./types";
import { Mesh, Vector3, PerspectiveCamera, Box3, Quaternion, Clock } from "three";
import { CameraControls } from "@react-three/drei";
import { SceneStore } from "../Scene/sceneStore";

interface DisplayCameraStoreState {
  enabled: boolean;
  cameraTargetTransform: DisplayContentTransform | null;
  cameraPositionTransform: DisplayContentTransform | null;
  cameraTransitionDuration: number;
  isTransitioning: boolean;
}

// Helper vectors for calculations (kept outside to avoid recreation)
const _centerPosition = new Vector3();
const _normal = new Vector3();
const _cameraPosition = new Vector3();
const _startUp = new Vector3();
const _targetUp = new Vector3();
const _currentUp = new Vector3();
const _clock = new Clock();

export const DisplayCameraStore = createStore<DisplayCameraStoreState>({
  enabled: true,
  cameraTargetTransform: null,
  cameraPositionTransform: null,
  cameraTransitionDuration: 1,
  isTransitioning: false,
}, {
  name: 'display-camera-store'
}).extendActions(({ set, get }) => ({
  fitToRect: (
    rect: Mesh,
    cameraControls: CameraControls
  ) => {
    const camera = SceneStore.get('camera');
    if (!camera) return;

    // Calculate the bounding box of the geometry
    const boundingBox = new Box3().setFromObject(rect);
    const rectWidth = boundingBox.max.x - boundingBox.min.x;
    const rectHeight = boundingBox.max.y - boundingBox.min.y;
  
    // Update the rect's world matrix to ensure correct positions
    rect.updateMatrixWorld();
  
    // Get the center position of the rectangle
    const rectCenterPosition = _centerPosition.copy(rect.position);
  
    // Calculate the normal vector of the rectangle
    const rectNormal = _normal.set(0, 0, -1).applyQuaternion(rect.quaternion);
  
    // Calculate the required distance to fit the rectangle in view
    const distance = cameraControls.getDistanceToFitBox(
      rectWidth,
      rectHeight,
      0
    );
  
    // Calculate the new camera position
    const targetPosition = rectNormal
      .clone()
      .multiplyScalar(-distance)
      .add(rectCenterPosition);
  
    // Compute the plane's up vector in world space
    const planeUp = new Vector3(0, 1, 0).applyQuaternion(rect.quaternion);
    
    // Store the starting up vector
    _startUp.copy(camera.camera.up);
    // Store the target up vector
    _targetUp.copy(planeUp);
    
    // Reset the clock for the animation
    _clock.start();
    
    const animate = () => {
      const progress = Math.min(_clock.getElapsedTime() / get('cameraTransitionDuration'), 1);

      // Smoothly interpolate the up vector
      _currentUp.copy(_startUp).lerp(_targetUp, progress);
      camera.camera.up.copy(_currentUp);

      // Update camera controls
      if (progress < 1) {
        set('isTransitioning', true);
        requestAnimationFrame(animate);
      } else {
        set('isTransitioning', false);
      }
    };

    // Start the animation
    set('isTransitioning', true);
    requestAnimationFrame(animate);

    // Use cameraControls.setLookAt to move the camera position and target
    cameraControls.setLookAt(
      targetPosition.x,
      targetPosition.y,
      targetPosition.z,
      rectCenterPosition.x,
      rectCenterPosition.y,
      rectCenterPosition.z,
      true // Enable smooth transition
    );
  },

  // Add a method to check if camera is currently transitioning
  isTransitioning: () => {
    return get('isTransitioning')
  },
}));

export default DisplayCameraStore;