/**
 * YouTube Content Processor
 *
 * Extracts content from YouTube videos using multiple strategies:
 * 1. DOM scraping when run from content script on youtube.com
 * 2. oEmbed API for metadata when given URL
 * 3. YouTube Data API v3 (optional, requires API key)
 *
 * Supports multiple URL formats:
 * - https://www.youtube.com/watch?v={videoId}
 * - https://youtu.be/{videoId}
 * - https://www.youtube.com/shorts/{videoId}
 * - https://m.youtube.com/watch?v={videoId}
 */

import { BaseContentProcessor, ProcessedContent, ValidationResult, Platform, MediaAsset } from './types';
import { MetadataExtractor } from '../services/MetadataExtractor';

export class YouTubeProcessor extends BaseContentProcessor {
  getPlatform(): Platform {
    return 'youtube';
  }

  canProcess(url: string): boolean {
    const patterns = [
      /https?:\/\/(www\.|m\.)?youtube\.com\/watch\?v=[\w-]+/i,
      /https?:\/\/youtu\.be\/[\w-]+/i,
      /https?:\/\/(www\.|m\.)?youtube\.com\/shorts\/[\w-]+/i,
      /https?:\/\/(www\.|m\.)?youtube\.com\/embed\/[\w-]+/i,
    ];

    return patterns.some(pattern => pattern.test(url));
  }

  extractPlatformId(url: string): string | null {
    // Standard watch URL: youtube.com/watch?v=VIDEO_ID
    let match = url.match(/[?&]v=([\w-]+)/i);
    if (match) return match[1];

    // Short URL: youtu.be/VIDEO_ID
    match = url.match(/youtu\.be\/([\w-]+)/i);
    if (match) return match[1];

    // Shorts URL: youtube.com/shorts/VIDEO_ID
    match = url.match(/\/shorts\/([\w-]+)/i);
    if (match) return match[1];

    // Embed URL: youtube.com/embed/VIDEO_ID
    match = url.match(/\/embed\/([\w-]+)/i);
    if (match) return match[1];

    return null;
  }

  async process(input: string | HTMLElement): Promise<ProcessedContent> {
    if (typeof input === 'string') {
      return this.processFromURL(input);
    } else {
      return this.processFromDOM(input);
    }
  }

  /**
   * Process from URL using oEmbed and metadata extraction
   */
  private async processFromURL(url: string): Promise<ProcessedContent> {
    const videoId = this.extractPlatformId(url);
    if (!videoId) {
      throw new Error('Could not extract YouTube video ID from URL');
    }

    // Normalize URL to standard format
    const normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Try oEmbed first for rich metadata
    const oEmbed = await MetadataExtractor.fetchOEmbed(normalizedUrl, 'youtube');

    // Also extract Open Graph and HTML metadata
    const metadata = await MetadataExtractor.extractAll(normalizedUrl);
    const best = MetadataExtractor.getBestMetadata(metadata);

    // Build processed content
    const content: ProcessedContent = {
      id: this.generateContentId('youtube', videoId),
      platform: 'youtube',
      platformContentId: videoId,
      url: normalizedUrl,
      title: oEmbed?.title || best.title,
      description: best.description,
      author: oEmbed?.author_name ? {
        name: oEmbed.author_name,
        url: oEmbed.author_url
      } : undefined,
      thumbnailUrl: oEmbed?.thumbnail_url || best.image,
      extractedAt: new Date()
    };

    // Extract media assets
    if (oEmbed?.thumbnail_url) {
      content.mediaAssets = [{
        type: 'image',
        url: oEmbed.thumbnail_url,
        width: oEmbed.thumbnail_width,
        height: oEmbed.thumbnail_height
      }];
    }

    // Store platform-specific metadata
    content.metadata = {
      oEmbed: oEmbed || undefined,
      provider: oEmbed?.provider_name,
      embedHtml: oEmbed?.html,
      openGraph: metadata.openGraph,
      twitterCard: metadata.twitterCard
    };

    return content;
  }

  /**
   * Process from DOM when on YouTube page
   */
  private async processFromDOM(element: HTMLElement): Promise<ProcessedContent> {
    // Extract video ID from page URL
    const videoId = this.extractPlatformId(window.location.href);
    if (!videoId) {
      throw new Error('Could not extract video ID from page URL');
    }

    const url = `https://www.youtube.com/watch?v=${videoId}`;

    // Extract title
    const titleElement = element.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string') ||
                        element.querySelector('h1.title yt-formatted-string') ||
                        document.querySelector('meta[name="title"]');
    const title = titleElement?.textContent?.trim() ||
                 (titleElement as HTMLMetaElement)?.content ||
                 document.title.replace(' - YouTube', '');

    // Extract description
    const descriptionElement = element.querySelector('#description yt-formatted-string') ||
                              element.querySelector('.ytd-expandable-video-description-body-renderer');
    const description = descriptionElement?.textContent?.trim();

    // Extract author/channel info
    const channelElement = element.querySelector('#channel-name a') ||
                          element.querySelector('ytd-channel-name a');
    const channelName = channelElement?.textContent?.trim();
    const channelUrl = channelElement?.getAttribute('href');

    // Extract thumbnail
    const thumbnailElement = element.querySelector('link[rel="image_src"]') as HTMLLinkElement;
    const thumbnailUrl = thumbnailElement?.href || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    // Extract view count
    const viewsElement = element.querySelector('.ytd-video-view-count-renderer .view-count') ||
                        element.querySelector('span.view-count');
    const viewsText = viewsElement?.textContent?.trim();
    const viewCount = this.parseViewCount(viewsText);

    // Extract like count (may be hidden)
    const likeElement = element.querySelector('#top-level-buttons-computed button[aria-label*="like"]');
    const likeText = likeElement?.getAttribute('aria-label');
    const likeCount = this.parseEngagementCount(likeText);

    // Extract upload date
    const dateElement = element.querySelector('#info-strings yt-formatted-string');
    const dateText = dateElement?.textContent?.trim();
    const uploadDate = this.parseUploadDate(dateText);

    // Extract duration (from video player or meta tag)
    const durationMeta = document.querySelector('meta[itemprop="duration"]') as HTMLMetaElement;
    const duration = durationMeta?.content;

    // Build media assets
    const mediaAssets: MediaAsset[] = [{
      type: 'image',
      url: thumbnailUrl
    }];

    return {
      id: this.generateContentId('youtube', videoId),
      platform: 'youtube',
      platformContentId: videoId,
      url,
      title,
      description,
      author: channelName ? {
        name: channelName,
        url: channelUrl ? `https://www.youtube.com${channelUrl}` : undefined
      } : undefined,
      thumbnailUrl,
      mediaAssets,
      metadata: {
        viewCount,
        likeCount,
        duration,
        uploadDate: uploadDate?.toISOString()
      },
      contentCreatedAt: uploadDate,
      extractedAt: new Date()
    };
  }

  async extractMetadata(input: string | HTMLElement): Promise<Record<string, any>> {
    if (typeof input === 'string') {
      const metadata = await MetadataExtractor.extractAll(input);
      const oEmbed = await MetadataExtractor.fetchOEmbed(input, 'youtube');

      return {
        openGraph: metadata.openGraph,
        twitterCard: metadata.twitterCard,
        htmlMeta: metadata.htmlMeta,
        oEmbed
      };
    }

    // Extract from DOM
    const videoId = this.extractPlatformId(window.location.href);

    return {
      videoId,
      pageTitle: document.title,
      url: window.location.href
    };
  }

  /**
   * Parse view count from various formats:
   * "1,234,567 views" -> 1234567
   * "1.2M views" -> 1200000
   * "1.2K views" -> 1200
   */
  private parseViewCount(text?: string): number | undefined {
    if (!text) return undefined;

    // Remove "views" and trim
    const cleaned = text.toLowerCase().replace(/views?/i, '').trim();

    // Handle abbreviated formats (1.2M, 1.2K)
    if (cleaned.includes('m')) {
      const num = parseFloat(cleaned);
      return Math.floor(num * 1_000_000);
    }
    if (cleaned.includes('k')) {
      const num = parseFloat(cleaned);
      return Math.floor(num * 1_000);
    }

    // Handle comma-separated numbers
    const num = parseInt(cleaned.replace(/,/g, ''), 10);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Parse engagement counts from aria-labels like "1,234 likes"
   */
  private parseEngagementCount(text?: string | null): number | undefined {
    if (!text) return undefined;

    const match = text.match(/[\d,]+/);
    if (!match) return undefined;

    const num = parseInt(match[0].replace(/,/g, ''), 10);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Parse upload date from YouTube date strings
   * Examples: "Jan 15, 2024", "Premiered Jan 15, 2024"
   */
  private parseUploadDate(text?: string): Date | undefined {
    if (!text) return undefined;

    // Remove "Premiered" prefix if present
    const cleaned = text.replace(/Premiered/i, '').trim();

    // Try to parse as date
    const date = new Date(cleaned);
    return isNaN(date.getTime()) ? undefined : date;
  }
}
