import { useSpring, SpringValue } from '@react-spring/three'
import { useCallback, useRef } from 'react'
import { useContentStore } from '../store/contentStore'
import { useSceneStore } from '../../scene/store'
import { GroupTransform, AnimationConfig, Position3D, Rotation3D } from '../positioning/types'

interface UseLayoutAnimationProps {
  groupTransform: GroupTransform
  animationConfig: AnimationConfig
}

interface UseLayoutAnimationResult {
  positionX: SpringValue<number>
  positionY: SpringValue<number>
  positionZ: SpringValue<number>
  rotationX: SpringValue<number>
  rotationY: SpringValue<number>
  rotationZ: SpringValue<number>
  scale: SpringValue<number>
  isAnimating: boolean
}

/**
 * Unified hook for layout animations
 * Handles spring animation for group transforms and fitToBox timing
 */
export function useLayoutAnimation({
  groupTransform,
  animationConfig,
}: UseLayoutAnimationProps): UseLayoutAnimationResult {
  const isAnimatingRef = useRef(false)

  // Handle animation start
  const onAnimationStart = useCallback(() => {
    isAnimatingRef.current = true
    useContentStore.setState({ isAnimating: true })
  }, [])

  // Handle animation complete - focus camera on content
  const onAnimationComplete = useCallback(() => {
    isAnimatingRef.current = false
    useContentStore.setState({ isAnimating: false })

    // Double RAF ensures PlaneView has set activeItemObject and geometry is ready
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Use focusOnContent for smart camera positioning in front of the plane
        useSceneStore.getState().focusOnContent()
      })
    })
  }, [])

  // Build spring config
  const springConfig = animationConfig.duration
    ? { duration: animationConfig.duration, easing: animationConfig.easing }
    : { tension: animationConfig.tension ?? 200, friction: animationConfig.friction ?? 30 }

  // Animate the group transform
  const {
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scale,
  } = useSpring({
    positionX: groupTransform.position[0],
    positionY: groupTransform.position[1],
    positionZ: groupTransform.position[2],
    rotationX: groupTransform.rotation[0],
    rotationY: groupTransform.rotation[1],
    rotationZ: groupTransform.rotation[2],
    scale: groupTransform.scale,
    config: springConfig,
    onStart: onAnimationStart,
    onRest: onAnimationComplete,
  })

  return {
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scale,
    isAnimating: isAnimatingRef.current,
  }
}

/**
 * Simple hook to trigger fitToBox after any state change
 * Used for resize handlers and initialization
 */
export function useFitToBox() {
  return useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        useSceneStore.getState().fitToBox()
      })
    })
  }, [])
}
