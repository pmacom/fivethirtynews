/**
 * Twitter/X Content Processor
 *
 * Extracts content from Twitter/X posts using DOM selectors or API data.
 * Adapted from extension/public/content.js
 */

import { BaseContentProcessor, ProcessedContent, Platform, MediaAsset } from './types';

export class TwitterProcessor extends BaseContentProcessor {
  getPlatform(): Platform {
    return 'twitter';
  }

  canProcess(url: string): boolean {
    return /https?:\/\/(www\.)?(twitter\.com|x\.com)\/\w+\/status\/\d+/i.test(url);
  }

  extractPlatformId(url: string): string | null {
    const match = url.match(/status\/(\d+)/i);
    return match ? match[1] : null;
  }

  /**
   * Process Twitter content from DOM element or URL
   */
  async process(input: string | HTMLElement): Promise<ProcessedContent> {
    if (typeof input === 'string') {
      // URL provided - need to fetch or use API
      return this.processFromUrl(input);
    } else {
      // DOM element provided (from content script)
      return this.processFromDOM(input);
    }
  }

  /**
   * Process from URL (fetch metadata)
   */
  private async processFromUrl(url: string): Promise<ProcessedContent> {
    const tweetId = this.extractPlatformId(url);
    if (!tweetId) {
      throw new Error('Could not extract tweet ID from URL');
    }

    // For now, return basic structure
    // TODO: Implement Open Graph fetching or Twitter API integration
    return {
      id: this.generateContentId('twitter', tweetId),
      platform: 'twitter',
      platformContentId: tweetId,
      url,
      extractedAt: new Date()
    };
  }

  /**
   * Process from DOM element (from content script)
   * This is the primary method used by the Chrome extension
   */
  private async processFromDOM(article: HTMLElement): Promise<ProcessedContent> {
    // Extract tweet link and ID
    const tweetLink = article.querySelector('a[href*="/status/"]') as HTMLAnchorElement;
    if (!tweetLink) {
      throw new Error('Could not find tweet link in DOM');
    }

    const tweetId = this.extractPlatformId(tweetLink.href);
    if (!tweetId) {
      throw new Error('Could not extract tweet ID from link');
    }

    // Extract tweet text
    const tweetTextElement = article.querySelector('[data-testid="tweetText"]');
    const tweetText = tweetTextElement ? tweetTextElement.textContent || '' : '';

    // Extract author information
    const authorElement = article.querySelector('[data-testid="User-Name"]');
    const authorText = authorElement ? authorElement.textContent || '' : '';

    // Try to extract username from URL
    const usernameMatch = tweetLink.href.match(/https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/(\w+)\/status/i);
    const username = usernameMatch ? usernameMatch[1] : undefined;

    // Extract thumbnail/media
    const thumbnailElement = article.querySelector('[data-testid="tweetPhoto"] img, [data-testid="card.layoutLarge.media"] img') as HTMLImageElement;
    const thumbnailUrl = thumbnailElement ? thumbnailElement.src : undefined;

    // Extract all media assets
    const mediaAssets = this.extractMediaAssets(article);

    // Extract timestamp if available
    const timeElement = article.querySelector('time');
    const contentCreatedAt = timeElement?.dateTime ? new Date(timeElement.dateTime) : undefined;

    return {
      id: this.generateContentId('twitter', tweetId),
      platform: 'twitter',
      platformContentId: tweetId,
      url: tweetLink.href,
      content: tweetText,
      description: tweetText, // For Twitter, content and description are the same
      author: {
        name: authorText,
        username,
        url: username ? `https://x.com/${username}` : undefined
      },
      thumbnailUrl,
      mediaAssets: mediaAssets.length > 0 ? mediaAssets : undefined,
      contentCreatedAt,
      extractedAt: new Date(),
      metadata: await this.extractMetadata(article)
    };
  }

  /**
   * Extract all media assets from tweet
   */
  private extractMediaAssets(article: HTMLElement): MediaAsset[] {
    const assets: MediaAsset[] = [];

    // Extract images
    const images = article.querySelectorAll('[data-testid="tweetPhoto"] img');
    images.forEach((img) => {
      const htmlImg = img as HTMLImageElement;
      assets.push({
        type: 'image',
        url: htmlImg.src,
        width: htmlImg.naturalWidth || undefined,
        height: htmlImg.naturalHeight || undefined
      });
    });

    // Extract videos
    const videos = article.querySelectorAll('video');
    videos.forEach((video) => {
      const htmlVideo = video as HTMLVideoElement;
      assets.push({
        type: 'video',
        url: htmlVideo.src || htmlVideo.currentSrc,
        width: htmlVideo.videoWidth || undefined,
        height: htmlVideo.videoHeight || undefined,
        duration: htmlVideo.duration || undefined
      });
    });

    // Limit to maxMediaAssets
    return assets.slice(0, this.options.maxMediaAssets);
  }

  /**
   * Extract Twitter-specific metadata
   */
  async extractMetadata(input: string | HTMLElement): Promise<Record<string, any>> {
    const metadata: Record<string, any> = {};

    if (typeof input === 'string') {
      // URL provided - could fetch Open Graph data
      // For now, return empty metadata
      return metadata;
    }

    const article = input as HTMLElement;

    // Extract engagement metrics if visible
    const replyCount = this.extractMetricCount(article, 'reply');
    const retweetCount = this.extractMetricCount(article, 'retweet');
    const likeCount = this.extractMetricCount(article, 'like');
    const viewCount = this.extractMetricCount(article, 'analytics');

    if (replyCount !== null) metadata.replyCount = replyCount;
    if (retweetCount !== null) metadata.retweetCount = retweetCount;
    if (likeCount !== null) metadata.likeCount = likeCount;
    if (viewCount !== null) metadata.viewCount = viewCount;

    // Extract if it's a retweet or quote tweet
    const isRetweet = article.querySelector('[data-testid="socialContext"]') !== null;
    if (isRetweet) metadata.isRetweet = true;

    // Extract if it has a poll
    const hasPoll = article.querySelector('[data-testid="cardPoll"]') !== null;
    if (hasPoll) metadata.hasPoll = true;

    // Extract language if available
    const tweetTextElement = article.querySelector('[data-testid="tweetText"]');
    if (tweetTextElement) {
      const lang = tweetTextElement.getAttribute('lang');
      if (lang) metadata.language = lang;
    }

    return metadata;
  }

  /**
   * Helper to extract engagement metric counts
   */
  private extractMetricCount(article: HTMLElement, metricType: string): number | null {
    const metricElement = article.querySelector(`[data-testid="${metricType}"]`);
    if (!metricElement) return null;

    const countText = metricElement.getAttribute('aria-label');
    if (!countText) return null;

    // Parse number from text like "5 replies" or "1.2K retweets"
    const match = countText.match(/([\d.]+)([KMB])?/i);
    if (!match) return null;

    let count = parseFloat(match[1]);
    const suffix = match[2];

    if (suffix) {
      const multipliers: Record<string, number> = {
        'K': 1000,
        'M': 1000000,
        'B': 1000000000
      };
      count *= multipliers[suffix.toUpperCase()] || 1;
    }

    return Math.round(count);
  }
}
