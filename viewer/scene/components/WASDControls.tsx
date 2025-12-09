'use client'

import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface WASDControlsProps {
  moveSpeed?: number
  rotateSpeed?: number
}

/**
 * WASD Camera Controls for Browse Mode
 *
 * Controls:
 * - W/S: Move forward/backward
 * - A/D: Move left/right (strafe)
 * - Q/E: Move down/up
 * - R/F: Rotate yaw left/right
 */
export const WASDControls = ({
  moveSpeed = 3,
  rotateSpeed = 1.5
}: WASDControlsProps) => {
  const { camera } = useThree()
  const keysPressed = useRef<Set<string>>(new Set())

  // Track movement direction vector
  const moveDirection = useRef(new THREE.Vector3())

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default for WASD keys to avoid page scrolling
      const key = e.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'q', 'e', 'r', 'f'].includes(key)) {
        e.preventDefault()
        keysPressed.current.add(key)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase())
    }

    // Clear keys when window loses focus
    const handleBlur = () => {
      keysPressed.current.clear()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  useFrame((_, delta) => {
    const keys = keysPressed.current
    if (keys.size === 0) return

    const speed = moveSpeed * delta
    const rotSpeed = rotateSpeed * delta

    // Reset movement direction
    moveDirection.current.set(0, 0, 0)

    // Forward/Backward (W/S)
    if (keys.has('w')) moveDirection.current.z -= 1
    if (keys.has('s')) moveDirection.current.z += 1

    // Left/Right strafe (A/D)
    if (keys.has('a')) moveDirection.current.x -= 1
    if (keys.has('d')) moveDirection.current.x += 1

    // Up/Down (E/Q)
    if (keys.has('e')) moveDirection.current.y += 1
    if (keys.has('q')) moveDirection.current.y -= 1

    // Apply movement in camera's local space
    if (moveDirection.current.lengthSq() > 0) {
      moveDirection.current.normalize().multiplyScalar(speed)

      // Transform to world space based on camera orientation
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
      const up = new THREE.Vector3(0, 1, 0) // Keep Y-up for consistency

      camera.position.addScaledVector(forward, -moveDirection.current.z)
      camera.position.addScaledVector(right, moveDirection.current.x)
      camera.position.addScaledVector(up, moveDirection.current.y)
    }

    // Yaw rotation (R/F) - rotate around world Y axis
    if (keys.has('r')) {
      camera.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), rotSpeed)
    }
    if (keys.has('f')) {
      camera.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), -rotSpeed)
    }
  })

  return null
}

export default WASDControls
