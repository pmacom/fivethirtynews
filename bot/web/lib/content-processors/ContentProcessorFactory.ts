/**
 * Content Processor Factory
 *
 * Routes URLs to the appropriate content processor based on URL patterns.
 * Priority: Media URLs → Platform-specific → Generic fallback
 */

import { BaseContentProcessor, Platform } from './types';
import { TwitterProcessor } from './TwitterProcessor';
import { YouTubeProcessor } from './YouTubeProcessor';
import { RedditProcessor } from './RedditProcessor';
// Import other processors as they're created
// import { BlueskyProcessor } from './BlueskyProcessor';
// import { GenericProcessor } from './GenericProcessor';
// import { MediaProcessor } from './MediaProcessor';

interface ProcessorClass {
  new (): BaseContentProcessor;
}

interface PlatformPattern {
  platform: Platform;
  patterns: RegExp[];
  processor: ProcessorClass;
  priority: number; // Higher = checked first
}

export class ContentProcessorFactory {
  private static patterns: PlatformPattern[] = [
    // Media files (highest priority)
    // {
    //   platform: 'media',
    //   patterns: [
    //     /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov|avi)(\?.*)?$/i,
    //     /https?:\/\/.*\.(jpg|jpeg|png|gif|webp|mp4|webm)(\?.*)?$/i
    //   ],
    //   processor: MediaProcessor,
    //   priority: 100
    // },

    // Twitter/X
    {
      platform: 'twitter',
      patterns: [
        /https?:\/\/(www\.)?(twitter\.com|x\.com)\/\w+\/status\/\d+/i,
        /https?:\/\/t\.co\/\w+/i // Twitter shortened URLs
      ],
      processor: TwitterProcessor,
      priority: 90
    },

    // YouTube
    {
      platform: 'youtube',
      patterns: [
        /https?:\/\/(www\.|m\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/i,
        /https?:\/\/(www\.|m\.)?youtube\.com\/shorts\/[\w-]+/i,
        /https?:\/\/(www\.|m\.)?youtube\.com\/embed\/[\w-]+/i
      ],
      processor: YouTubeProcessor,
      priority: 90
    },

    // Reddit
    {
      platform: 'reddit',
      patterns: [
        /https?:\/\/(www\.|old\.)?reddit\.com\/r\/\w+\/comments\/\w+/i,
        /https?:\/\/redd\.it\/\w+/i
      ],
      processor: RedditProcessor,
      priority: 90
    },

    // Bluesky
    // {
    //   platform: 'bluesky',
    //   patterns: [
    //     /https?:\/\/(www\.)?bsky\.app\/profile\/[\w.]+\/post\/\w+/i
    //   ],
    //   processor: BlueskyProcessor,
    //   priority: 90
    // },

    // Generic fallback (lowest priority)
    // {
    //   platform: 'generic',
    //   patterns: [
    //     /https?:\/\/.+/i
    //   ],
    //   processor: GenericProcessor,
    //   priority: 0
    // }
  ];

  /**
   * Detect platform from URL
   */
  static detectPlatform(url: string): Platform | null {
    // Sort by priority (highest first)
    const sortedPatterns = [...this.patterns].sort((a, b) => b.priority - a.priority);

    for (const { platform, patterns } of sortedPatterns) {
      for (const pattern of patterns) {
        if (pattern.test(url)) {
          return platform;
        }
      }
    }

    return null;
  }

  /**
   * Create appropriate processor for URL
   */
  static createProcessor(url: string): BaseContentProcessor | null {
    const sortedPatterns = [...this.patterns].sort((a, b) => b.priority - a.priority);

    for (const { patterns, processor } of sortedPatterns) {
      for (const pattern of patterns) {
        if (pattern.test(url)) {
          return new processor();
        }
      }
    }

    return null;
  }

  /**
   * Check if URL can be processed by any registered processor
   */
  static canProcess(url: string): boolean {
    return this.detectPlatform(url) !== null;
  }

  /**
   * Get all supported platforms
   */
  static getSupportedPlatforms(): Platform[] {
    return [...new Set(this.patterns.map(p => p.platform))];
  }

  /**
   * Register a new processor (for extensibility)
   */
  static registerProcessor(
    platform: Platform,
    patterns: RegExp[],
    processor: ProcessorClass,
    priority: number = 50
  ): void {
    this.patterns.push({
      platform,
      patterns,
      processor,
      priority
    });
  }
}
