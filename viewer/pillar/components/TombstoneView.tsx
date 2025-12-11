import { useThree } from "@react-three/fiber"
import { useEffect, useRef, useState } from "react"
import * as THREE from 'three'
import { Container, Text } from '@react-three/uikit'
import { useContentStore } from '../../core/store/contentStore'

interface TombstoneViewProps {
  active: boolean
  itemId?: string
  tweetText?: string
  authorName?: string
  authorHandle?: string
}

/**
 * TombstoneView - A 3D visual indicator for deleted/tombstoned tweets
 * Renders a gravestone shape with optional tweet text overlay
 */
export const TombstoneView = ({
  active,
  itemId,
  tweetText,
  authorName,
  authorHandle
}: TombstoneViewProps) => {
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

  // Tombstone dimensions - sized relative to viewport
  const stoneWidth = Math.min(screenAspect[0], screenAspect[1]) * 0.45
  const stoneHeight = stoneWidth * 1.3
  const stoneTopRadius = stoneWidth * 0.5

  // Truncate tweet text for display
  const maxTextLength = 150
  const displayText = tweetText && tweetText.length > maxTextLength
    ? tweetText.substring(0, maxTextLength) + '...'
    : tweetText

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
        <meshBasicMaterial color="#0f0f0f" />
      </mesh>

      {/* Tombstone base (rectangle) */}
      <mesh position={[0, -stoneHeight * 0.15, 0.002]}>
        <planeGeometry args={[stoneWidth, stoneHeight * 0.7]} />
        <meshBasicMaterial color="#4b5563" />
      </mesh>

      {/* Tombstone top (rounded top - using a circle) */}
      <mesh position={[0, stoneHeight * 0.2, 0.002]}>
        <circleGeometry args={[stoneTopRadius, 32, 0, Math.PI]} />
        <meshBasicMaterial color="#4b5563" />
      </mesh>

      {/* Inner darker area for depth effect */}
      <mesh position={[0, -stoneHeight * 0.1, 0.003]}>
        <planeGeometry args={[stoneWidth * 0.85, stoneHeight * 0.55]} />
        <meshBasicMaterial color="#374151" />
      </mesh>

      {/* RIP text using uikit */}
      <group position={[0, stoneHeight * 0.15, 0.01]}>
        <Text
          fontSize={0.06}
          fontWeight="bold"
          color="#9ca3af"
          letterSpacing={0.02}
          anchorX="center"
          anchorY="middle"
        >
          RIP
        </Text>
      </group>

      {/* Tweet deleted message */}
      <group position={[0, -stoneHeight * 0.1, 0.01]}>
        <Text
          fontSize={0.025}
          color="#6b7280"
          anchorX="center"
          anchorY="middle"
        >
          Tweet Deleted
        </Text>
      </group>

      {/* Author and tweet text overlay at bottom */}
      {(displayText || authorHandle) && (
        <group position={[0, -stoneHeight * 0.55, 0.01]}>
          <Container
            backgroundColor="rgba(0, 0, 0, 0.85)"
            padding={0.02}
            borderRadius={0.01}
            flexDirection="column"
            gap={0.01}
            alignItems="center"
            justifyContent="center"
          >
            {authorHandle && (
              <Container flexDirection="row" gap={0.01} alignItems="center">
                {authorName && (
                  <Text fontSize={0.018} color="#d1d5db">
                    {authorName}
                  </Text>
                )}
                <Text fontSize={0.018} color="#9ca3af">
                  {authorHandle}
                </Text>
              </Container>
            )}
            {displayText && (
              <Text
                fontSize={0.02}
                color="#e5e7eb"
                lineHeight={1.4}
                textAlign="center"
                maxWidth={0.5}
              >
                {displayText}
              </Text>
            )}
          </Container>
        </group>
      )}
    </group>
  )
}

export default TombstoneView
