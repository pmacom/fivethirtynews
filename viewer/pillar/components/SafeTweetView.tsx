import React, { useState, useEffect } from 'react'
import { PlaneView } from './PlaneView'
import ErrorBoundary from '../../ErrorBoundary'

import { LiveViewContentBlockItems } from '@/viewer/core/content/types'
import { Text } from '@react-three/uikit'


// Gray 1x1 pixel PNG as broken image placeholder
const BROKEN_IMAGE_PLACEHOLDER = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg=='

interface SafePlaneViewProps {
  url: string
  active: boolean
  item: LiveViewContentBlockItems
  onClick?: () => void
}

/**
 * SafePlaneView wraps PlaneView with error boundary to gracefully handle texture loading failures.
 * When a texture fails to load, it displays a gray placeholder instead of crashing the app.
 */
export const SafeTweetView: React.FC<SafePlaneViewProps> = ({
  url,
  active,
  item,
  onClick
}) => {
  const [errorKey, setErrorKey] = useState(0)

  // Reset error boundary when URL changes by incrementing key
  useEffect(() => {
    setErrorKey(prev => prev + 1)
  }, [url])

  return (
    <ErrorBoundary
      key={errorKey}
      fallback={<PlaneView url={BROKEN_IMAGE_PLACEHOLDER} active={active} onClick={onClick} />}
    >
      <group position={[0, 0, .01]}>
        <Text
          fontSize={3}
          color="#ffffff"
          fontWeight="normal"
          lineHeight={1.4}
          alignContent="flex-start"
          maxWidth={90}
          maxHeight={1}
          overflow="hidden"
          >
          {item.content?.description}
        </Text>
      
      
      </group>
      <PlaneView
        url={url}
        active={active}
        onClick={onClick}
      />
    </ErrorBoundary>
  )
}

export default SafeTweetView
