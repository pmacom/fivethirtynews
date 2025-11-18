import { useEffect, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { Container, Text, DefaultProperties } from '@react-three/uikit'

interface TextPlaneViewProps {
  text: string
  displayName: string
  handle: string
  timestamp: string
  fontSize: number
  active: boolean
}

/**
 * TextPlaneView - Renders text content at the same dimensions as PlaneView
 *
 * Uses the same screenAspect calculation as PlaneView to ensure consistent
 * sizing between media tweets (PlaneView) and text-only tweets (TextPlaneView)
 *
 * Dimensions match PlaneView.tsx:
 * - planeHeight = 1.0 (fills the 1-unit spacing exactly)
 * - planeWidth = planeHeight * viewportAspect
 * - screenAspect = [planeWidth, planeHeight]
 */
export const TextPlaneView = ({
  text,
  displayName,
  handle,
  timestamp,
  fontSize,
  active
}: TextPlaneViewProps) => {
  const { size: { width, height } } = useThree()
  const [screenAspect, setScreenAspect] = useState<[number, number]>([1, 1])

  // Match PlaneView's viewport-based sizing logic
  useEffect(() => {
    const planeHeight = 1.0 // Fill the 1-unit spacing exactly
    const viewportAspect = width / height
    const planeWidth = planeHeight * viewportAspect
    setScreenAspect([planeWidth, planeHeight])
  }, [width, height])

  return (
    <DefaultProperties>
      <Container
        // Use exact same dimensions as PlaneView's screenAspect mesh
        width={screenAspect[0]}
        height={screenAspect[1]}

        // Card styling
        backgroundColor="#15202b"
        backgroundOpacity={0.95}
        borderRadius={0.015}
        padding={0.025}

        // Layout
        flexDirection="column"
        gap={0.015}
        justifyContent="center"
        alignItems="center"
      >
        {/* Header: Avatar + Name + Handle */}
        <Container flexDirection="row" gap={0.012} alignItems="center" flexShrink={0}>
          {/* Avatar Circle */}
          <Container
            width={0.08}
            height={0.08}
            borderRadius={0.04}
            backgroundColor="#1d9bf0"
            backgroundOpacity={1}
          />

          {/* Name and Handle */}
          <Container flexDirection="column" gap={0.008}>
            <Text fontSize={0.020} fontWeight="bold" color="#e7e9ea">
              {displayName}
            </Text>
            <Container flexDirection="row" gap={0.004}>
              <Text fontSize={0.016} color="#71767b">{handle}</Text>
              {timestamp && (
                <>
                  <Text fontSize={0.016} color="#71767b">·</Text>
                  <Text fontSize={0.016} color="#71767b">{timestamp}</Text>
                </>
              )}
            </Container>
          </Container>
        </Container>

        {/* Tweet Text */}
        <Container flexGrow={1} width="100%" justifyContent="center" alignItems="center">
          <Text
            fontSize={fontSize}
            color="#e7e9ea"
            lineHeight={1.4}
            textAlign="center"
          >
            {text}
          </Text>
        </Container>
      </Container>
    </DefaultProperties>
  )
}

export default TextPlaneView
