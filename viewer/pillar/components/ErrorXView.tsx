import { useThree } from "@react-three/fiber"
import { useEffect, useRef, useState } from "react"
import * as THREE from 'three'
import { Html } from "@react-three/drei"
import { useContentStore } from '../../core/store/contentStore'

interface ErrorXViewProps {
  active: boolean
  itemId?: string
  message?: string
}

/**
 * ErrorXView - A 3D visual indicator for broken/unknown content
 * Renders two crossed red rectangles forming an X shape
 */
export const ErrorXView = ({ active, itemId, message }: ErrorXViewProps) => {
  const { size: { width, height } } = useThree()
  const [screenAspect, setScreenAspect] = useState<[number, number]>([1, 1])
  const screenRef = useRef<THREE.Mesh>(null)

  // Viewport-based sizing to match other content
  useEffect(() => {
    const planeHeight = 1.0
    const viewportAspect = width / height
    const planeWidth = planeHeight * viewportAspect
    setScreenAspect([planeWidth, planeHeight])
  }, [width, height])

  // Set activeItemObject when this becomes active
  useEffect(() => {
    if (active && screenRef.current) {
      useContentStore.setState({ activeItemObject: screenRef.current })
    }
  }, [active])

  // X dimensions - sized relative to viewport
  const barLength = Math.min(screenAspect[0], screenAspect[1]) * 0.6
  const barThickness = barLength * 0.12

  return (
    <group>
      {/* Invisible screen plane for bounds/interaction */}
      <mesh ref={screenRef}>
        <planeGeometry args={[screenAspect[0], screenAspect[1]]} />
        <meshBasicMaterial transparent opacity={0} visible={false} />
      </mesh>

      {/* Dark background */}
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[screenAspect[0], screenAspect[1]]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>

      {/* First bar of X (top-left to bottom-right) */}
      <mesh position={[0, 0, 0.002]} rotation={[0, 0, Math.PI / 4]}>
        <planeGeometry args={[barLength, barThickness]} />
        <meshBasicMaterial color="#dc2626" />
      </mesh>

      {/* Second bar of X (top-right to bottom-left) */}
      <mesh position={[0, 0, 0.003]} rotation={[0, 0, -Math.PI / 4]}>
        <planeGeometry args={[barLength, barThickness]} />
        <meshBasicMaterial color="#dc2626" />
      </mesh>

      {/* Error message overlay */}
      {message && (
        <Html center position={[0, -barLength * 0.5, 0]} distanceFactor={1}>
          <div style={{
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#ef4444',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}>
            {message}
          </div>
        </Html>
      )}
    </group>
  )
}

export default ErrorXView
