import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useSceneStore } from '../../scene/store'
import { useFitToBox } from './useLayoutAnimation'

/**
 * Hook that handles canvas resize events
 * Updates scene store and triggers fitToBox
 */
export function useCanvasResize() {
  const { size: { width: canvasWidth, height: canvasHeight } } = useThree()
  const fitToBox = useFitToBox()

  useEffect(() => {
    useSceneStore.setState({ canvasWidth, canvasHeight })
    fitToBox()
  }, [canvasWidth, canvasHeight, fitToBox])

  return { canvasWidth, canvasHeight }
}
