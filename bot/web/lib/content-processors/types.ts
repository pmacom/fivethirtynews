/**
 * Content Processor Types
 *
 * Defines the structure for multi-platform content extraction and processing.
 * Inspired by Discord-based content curation but adapted for direct DOM/API extraction.
 */

export type Platform =
  | 'twitter'
  | 'youtube'
  | 'reddit'
  | 'bluesky'
  | 'generic'
  | 'media'
  | 'text';

export type MediaType = 'image' | 'video' | 'audio' | 'embed';

export interface MediaAsset {
  type: MediaType;
  url: string;
  width?: number;
  height?: number;
  duration?: number; // For video/audio in seconds
  mimeType?: string;
}

export interface Author {
  name: string;
  username?: string;
  url?: string;
  avatarUrl?: string;
}

export interface ProcessedContent {
  // Core identification
  id: string; // Deterministic ID for deduplication
  platform: Platform;
  platformContentId: string; // Platform's native ID (tweetId, videoId, etc.)
  url: string;

  // Content
  title?: string;
  description?: string;
  content?: string; // Full text content

  // Author
  author?: Author;

  // Media
  thumbnailUrl?: string;
  mediaAssets?: MediaAsset[];

  // Metadata (platform-specific)
  metadata?: Record<string, any>;

  // Timestamps
  contentCreatedAt?: Date;
  extractedAt: Date;
}

export interface ContentProcessorOptions {
  fetchMetadata?: boolean; // Whether to fetch additional metadata
  includeMedia?: boolean; // Whether to extract media URLs
  maxMediaAssets?: number; // Limit number of media assets
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  platform?: Platform;
}

/**
 * Abstract base class for content processors
 */
export abstract class BaseContentProcessor {
  protected options: ContentProcessorOptions;

  constructor(options: ContentProcessorOptions = {}) {
    this.options = {
      fetchMetadata: true,
      includeMedia: true,
      maxMediaAssets: 10,
      ...options
    };
  }

  /**
   * Detect if this processor can handle the given URL
   */
  abstract canProcess(url: string): boolean;

  /**
   * Get the platform this processor handles
   */
  abstract getPlatform(): Platform;

  /**
   * Extract platform-specific ID from URL
   */
  abstract extractPlatformId(url: string): string | null;

  /**
   * Generate deterministic content ID for deduplication
   * Format: platform:platformContentId
   */
  generateContentId(platform: Platform, platformContentId: string): string {
    return `${platform}:${platformContentId}`;
  }

  /**
   * Validate the content/URL
   */
  async validate(input: string): Promise<ValidationResult> {
    if (!this.canProcess(input)) {
      return {
        isValid: false,
        error: `This processor cannot handle: ${input}`
      };
    }

    const platformId = this.extractPlatformId(input);
    if (!platformId) {
      return {
        isValid: false,
        error: 'Could not extract platform ID'
      };
    }

    return {
      isValid: true,
      platform: this.getPlatform()
    };
  }

  /**
   * Process the content and extract all relevant data
   */
  abstract process(input: string | HTMLElement): Promise<ProcessedContent>;

  /**
   * Extract platform-specific metadata
   */
  abstract extractMetadata(input: string | HTMLElement): Promise<Record<string, any>>;
}
