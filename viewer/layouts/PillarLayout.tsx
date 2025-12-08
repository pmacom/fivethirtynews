"use client"

import { ContentScene } from '../core/components'
import { pillarPositioner } from '../core/positioning'

/**
 * PillarLayout - Circular column layout
 * Items arranged in vertical columns positioned around a circle.
 * The pillar rotates to face the active category toward the camera.
 */
export const PillarLayout = () => {
  return (
    <ContentScene
      positioner={pillarPositioner}
      enableNavigation={true}
    />
  )
}

export default PillarLayout
