import React, { useState, useEffect } from 'react'
import { PlaneView } from './PlaneView'
import ErrorBoundary from '../../ErrorBoundary'

// Gray 1x1 pixel PNG as broken image placeholder
const BROKEN_IMAGE_PLACEHOLDER = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg=='

interface SafePlaneViewProps {
  url: string
  active: boolean
  videoUrl?: string
  itemId?: string
  onClick?: () => void
}

/**
 * SafePlaneView wraps PlaneView with error boundary to gracefully handle texture loading failures.
 * When a texture fails to load, it displays a gray placeholder instead of crashing the app.
 */
export const SafePlaneView: React.FC<SafePlaneViewProps> = ({
  url,
  active,
  videoUrl,
  itemId,
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
      silent={true} // Suppress console errors for expected image loading failures
      fallback={<PlaneView url={BROKEN_IMAGE_PLACEHOLDER} active={active} onClick={onClick} />}
    >
      <PlaneView
        url={url}
        active={active}
        videoUrl={videoUrl}
        itemId={itemId}
        onClick={onClick}
      />
    </ErrorBoundary>
  )
}

export default SafePlaneView
