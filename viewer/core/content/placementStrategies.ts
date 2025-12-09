import { ViewMode } from '../store/viewModeStore'
import { LiveViewContentBlock, LiveViewContentBlockItems } from './types'
import { Position3D } from '../positioning/types'

const ADDED_CATEGORY_ID = 'added-content'
const ADDED_CATEGORY_NAME = 'Added'
const SEARCH_RESULTS_NAME = 'Search Results'

/**
 * Map platform values from search API to expected content_type values
 * The TemplateSwitcher expects specific content_type values like 'video', 'twitter', etc.
 * but search API returns platform names like 'youtube', 'x', etc.
 */
function mapPlatformToContentType(platform: string): string {
  const platformMap: Record<string, string> = {
    'youtube': 'video',
    'vimeo': 'video',
    'twitter': 'twitter',
    'x': 'twitter',
    'tiktok': 'video',
  }
  return platformMap[platform.toLowerCase()] || platform
}

export interface PlacementResult {
  // The category to add to (create if doesn't exist)
  categoryId: string
  categoryName: string
  // Index within category (-1 = append to end)
  insertIndex: number
  // For cloud: custom positions for clustering
  customPositions?: Position3D[]
}

/**
 * Cloud placement: cluster items near active item
 */
export function getCloudPlacement(
  itemCount: number,
  activePosition?: Position3D
): PlacementResult {
  const anchor = activePosition || [0, 0, 0]
  const customPositions: Position3D[] = []

  // Generate cluster positions around anchor
  for (let i = 0; i < itemCount; i++) {
    const angle = (i / itemCount) * Math.PI * 2
    const radius = 1.5 + Math.random() * 0.5
    customPositions.push([
      anchor[0] + Math.cos(angle) * radius,
      anchor[1] + (Math.random() - 0.5) * 0.5,
      anchor[2] + Math.sin(angle) * radius,
    ])
  }

  return {
    categoryId: ADDED_CATEGORY_ID,
    categoryName: ADDED_CATEGORY_NAME,
    insertIndex: -1,
    customPositions,
  }
}

/**
 * Stack placement: add to end of stack
 */
export function getStackPlacement(): PlacementResult {
  return {
    categoryId: ADDED_CATEGORY_ID,
    categoryName: ADDED_CATEGORY_NAME,
    insertIndex: -1,
  }
}

/**
 * Carousel placement: add to end of carousel
 */
export function getCarouselPlacement(): PlacementResult {
  return {
    categoryId: ADDED_CATEGORY_ID,
    categoryName: ADDED_CATEGORY_NAME,
    insertIndex: -1,
  }
}

/**
 * Pillar placement: add as new "Search Results" column
 */
export function getPillarPlacement(): PlacementResult {
  return {
    categoryId: ADDED_CATEGORY_ID,
    categoryName: SEARCH_RESULTS_NAME,
    insertIndex: -1,
  }
}

/**
 * Get placement strategy for the current view mode
 */
export function getPlacementForViewMode(
  viewMode: ViewMode,
  itemCount: number,
  activePosition?: Position3D
): PlacementResult {
  switch (viewMode) {
    case 'cloud':
      return getCloudPlacement(itemCount, activePosition)
    case 'stack':
      return getStackPlacement()
    case 'carousel':
      return getCarouselPlacement()
    case 'pillar':
    default:
      return getPillarPlacement()
  }
}

/**
 * Create a content block item from search result data
 */
export function createContentBlockItem(
  content: {
    id: string
    platform_content_id?: string | null  // Twitter ID, YouTube ID, etc.
    title: string | null
    description: string | null
    url: string
    thumbnail_url: string | null
    platform: string
  },
  customPosition?: Position3D
): LiveViewContentBlockItems {
  const contentType = mapPlatformToContentType(content.platform)

  // For Twitter content, use platform_content_id for content_id so tweet lookup works
  // The Tweet template uses content_id to look up tweet data from useTweetStore
  const isTwitter = contentType === 'twitter'
  const contentId = isTwitter && content.platform_content_id
    ? content.platform_content_id
    : content.id

  return {
    id: content.id,
    note: '',
    weight: 0,
    content_block_id: ADDED_CATEGORY_ID,
    news_id: content.id,
    content: {
      id: content.id,
      content_id: contentId,
      version: 1,
      content_type: contentType as any,
      content_url: content.url,
      content_created_at: new Date().toISOString(),
      thumbnail_url: content.thumbnail_url || '',
      submitted_by: '',
      submitted_at: new Date().toISOString(),
      category: '',
      categories: [],
      description: content.description || '',
      // Include platform_content_id for batch tweet fetching
      ...(content.platform_content_id ? { platform_content_id: content.platform_content_id } : {}),
    },
    // Store custom position if provided (for cloud clustering)
    ...(customPosition ? { customPosition } : {}),
  } as LiveViewContentBlockItems
}
