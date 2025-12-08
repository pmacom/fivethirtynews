"use client"

import { ContentScene } from '../core/components'
import { carouselPositioner } from '../core/positioning'

/**
 * CarouselLayout - Horizontal scrolling layout
 * Items arranged in a horizontal line, scrolling to center the active item.
 */
export const CarouselLayout = () => {
  return (
    <ContentScene
      positioner={carouselPositioner}
      enableNavigation={true}
    />
  )
}

export default CarouselLayout
