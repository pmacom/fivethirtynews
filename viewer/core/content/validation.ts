/**
 * Content Validation Utilities
 *
 * Provides validation functions for content items to catch missing or malformed data
 * before it causes rendering errors.
 */

import { LiveViewContentBlockItems, LiveViewContent, ContentType } from './types'
import logger from '../../utils/logger'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validate a content object for required fields and data integrity
 */
export function validateContent(content: LiveViewContent | null | undefined): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!content) {
    errors.push('Content is null or undefined')
    return { valid: false, errors, warnings }
  }

  // Required fields
  if (!content.id) {
    errors.push('Missing content.id')
  }

  if (!content.content_type) {
    errors.push('Missing content.content_type')
  } else if (!Object.values(ContentType).includes(content.content_type)) {
    errors.push(`Invalid content_type: ${content.content_type}`)
  }

  if (!content.content_id) {
    errors.push('Missing content.content_id')
  }

  // Conditional requirements based on content type
  if (content.content_type === ContentType.VIDEO && !content.content_url) {
    errors.push('Video content missing content_url')
  }

  if (content.content_type === ContentType.IMAGE && !content.thumbnail_url) {
    errors.push('Image content missing thumbnail_url')
  }

  // Warnings for missing optional but important fields
  if (!content.thumbnail_url) {
    warnings.push('Missing thumbnail_url - will use fallback placeholder')
  }

  if (!content.description) {
    warnings.push('Missing description')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate a content block item for required fields and nested content
 */
export function validateContentItem(item: LiveViewContentBlockItems | null | undefined): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!item) {
    errors.push('Content item is null or undefined')
    return { valid: false, errors, warnings }
  }

  // Required item fields
  if (!item.id) {
    errors.push('Missing item.id')
  }

  if (!item.content_block_id) {
    errors.push('Missing item.content_block_id')
  }

  if (!item.news_id) {
    errors.push('Missing item.news_id')
  }

  // Validate nested content
  const contentValidation = validateContent(item.content)
  errors.push(...contentValidation.errors.map(e => `item.content: ${e}`))
  warnings.push(...contentValidation.warnings.map(w => `item.content: ${w}`))

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate content and log results
 * Returns true if valid, false otherwise
 */
export function validateAndLog(
  item: LiveViewContentBlockItems,
  context: string = 'content_validation'
): boolean {
  const result = validateContentItem(item)

  if (!result.valid) {
    logger.error(`Content validation failed: ${context}`, {
      itemId: item?.id,
      errors: result.errors,
      warnings: result.warnings,
      contentType: item?.content?.content_type,
      timestamp: Date.now()
    })
  } else if (result.warnings.length > 0) {
    logger.warn(`Content validation warnings: ${context}`, {
      itemId: item?.id,
      warnings: result.warnings,
      contentType: item?.content?.content_type
    })
  }

  return result.valid
}

/**
 * Check if content has required media (thumbnail or video)
 */
export function hasRequiredMedia(content: LiveViewContent | null | undefined): boolean {
  if (!content) return false

  const hasThumbnail = !!content.thumbnail_url
  const hasVideo = !!content.content_url && content.content_type === ContentType.VIDEO

  return hasThumbnail || hasVideo
}

/**
 * Get a user-friendly error message for missing media
 */
export function getMediaErrorMessage(content: LiveViewContent | null | undefined): string {
  if (!content) return 'Content is missing'

  if (content.content_type === ContentType.VIDEO && !content.content_url) {
    return 'Video URL is missing'
  }

  if (content.content_type === ContentType.IMAGE && !content.thumbnail_url) {
    return 'Image URL is missing'
  }

  if (!content.thumbnail_url) {
    return 'Thumbnail is missing'
  }

  return 'Media is unavailable'
}
