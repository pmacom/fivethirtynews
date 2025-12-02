/**
 * Reddit Content Processor
 *
 * Extracts content from Reddit posts using multiple strategies:
 * 1. DOM scraping when run from content script on reddit.com
 * 2. oEmbed API for metadata when given URL
 * 3. Reddit JSON API (append .json to URL)
 *
 * Supports multiple URL formats:
 * - https://www.reddit.com/r/{subreddit}/comments/{postId}/{slug}/
 * - https://old.reddit.com/r/{subreddit}/comments/{postId}/{slug}/
 * - https://redd.it/{postId}
 */

import { BaseContentProcessor, ProcessedContent, ValidationResult, Platform, MediaAsset } from './types';
import { MetadataExtractor } from '../services/MetadataExtractor';

export class RedditProcessor extends BaseContentProcessor {
  getPlatform(): Platform {
    return 'reddit';
  }

  canProcess(url: string): boolean {
    const patterns = [
      /https?:\/\/(www\.|old\.)?reddit\.com\/r\/\w+\/comments\/[\w]+/i,
      /https?:\/\/redd\.it\/[\w]+/i,
    ];

    return patterns.some(pattern => pattern.test(url));
  }

  extractPlatformId(url: string): string | null {
    // Standard URL: reddit.com/r/subreddit/comments/POST_ID/slug/
    let match = url.match(/\/comments\/([\w]+)/i);
    if (match) return match[1];

    // Short URL: redd.it/POST_ID
    match = url.match(/redd\.it\/([\w]+)/i);
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
   * Process from URL using Reddit JSON API and oEmbed
   */
  private async processFromURL(url: string): Promise<ProcessedContent> {
    const postId = this.extractPlatformId(url);
    if (!postId) {
      throw new Error('Could not extract Reddit post ID from URL');
    }

    // Normalize URL to standard format
    const normalizedUrl = this.normalizeUrl(url);

    // Try Reddit JSON API first
    let redditData = null;
    try {
      const jsonUrl = normalizedUrl.replace(/\/$/, '') + '.json';
      const response = await fetch(jsonUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; 530Bot/1.0; +https://530.social)'
        }
      });

      if (response.ok) {
        const json = await response.json();
        // Reddit returns an array with [0] = post listing, [1] = comments listing
        redditData = json[0]?.data?.children?.[0]?.data;
      }
    } catch (error) {
      console.error('530: Failed to fetch Reddit JSON API', error);
    }

    // Also try oEmbed for rich metadata
    const oEmbed = await MetadataExtractor.fetchOEmbed(normalizedUrl, 'reddit');

    // Also extract Open Graph metadata as fallback
    const metadata = await MetadataExtractor.extractAll(normalizedUrl);
    const best = MetadataExtractor.getBestMetadata(metadata);

    // Build processed content
    const content: ProcessedContent = {
      id: this.generateContentId('reddit', postId),
      platform: 'reddit',
      platformContentId: postId,
      url: normalizedUrl,
      title: redditData?.title || oEmbed?.title || best.title,
      description: redditData?.selftext || best.description,
      content: redditData?.selftext,
      author: redditData?.author ? {
        name: redditData.author,
        username: redditData.author,
        url: `https://www.reddit.com/user/${redditData.author}`
      } : undefined,
      thumbnailUrl: this.getRedditThumbnail(redditData) || oEmbed?.thumbnail_url || best.image,
      extractedAt: new Date()
    };

    // Extract media assets
    const mediaAssets: MediaAsset[] = [];

    if (redditData?.preview?.images?.[0]?.source) {
      const source = redditData.preview.images[0].source;
      mediaAssets.push({
        type: 'image',
        url: this.decodeHtmlEntities(source.url),
        width: source.width,
        height: source.height
      });
    }

    if (redditData?.is_video && redditData?.media?.reddit_video) {
      mediaAssets.push({
        type: 'video',
        url: redditData.media.reddit_video.fallback_url,
        width: redditData.media.reddit_video.width,
        height: redditData.media.reddit_video.height,
        duration: redditData.media.reddit_video.duration
      });
    }

    if (mediaAssets.length > 0) {
      content.mediaAssets = mediaAssets;
    }

    // Store platform-specific metadata
    content.metadata = {
      subreddit: redditData?.subreddit,
      subredditNamePrefixed: redditData?.subreddit_name_prefixed,
      score: redditData?.score,
      upvoteRatio: redditData?.upvote_ratio,
      numComments: redditData?.num_comments,
      isVideo: redditData?.is_video,
      isSelf: redditData?.is_self,
      postHint: redditData?.post_hint,
      domain: redditData?.domain,
      permalink: redditData?.permalink,
      oEmbed: oEmbed || undefined,
      openGraph: metadata.openGraph
    };

    // Parse created timestamp
    if (redditData?.created_utc) {
      content.contentCreatedAt = new Date(redditData.created_utc * 1000);
    }

    return content;
  }

  /**
   * Process from DOM when on Reddit page
   */
  private async processFromDOM(element: HTMLElement): Promise<ProcessedContent> {
    // Extract post ID from page URL or element
    const postId = this.extractPlatformId(window.location.href);
    if (!postId) {
      throw new Error('Could not extract post ID from page URL');
    }

    const url = window.location.href;

    // Extract title
    const titleElement = element.querySelector('h1') ||
                        element.querySelector('[data-test-id="post-content"] h3') ||
                        document.querySelector('meta[property="og:title"]');
    const title = titleElement?.textContent?.trim() ||
                 (titleElement as HTMLMetaElement)?.content;

    // Extract post text content
    const contentElement = element.querySelector('[data-test-id="post-content"] > div:last-child') ||
                          element.querySelector('.usertext-body');
    const content = contentElement?.textContent?.trim();

    // Extract author
    const authorElement = element.querySelector('[data-testid="post_author_link"]') ||
                         element.querySelector('a[href*="/user/"]');
    const authorName = authorElement?.textContent?.trim();
    const authorHref = authorElement?.getAttribute('href');

    // Extract subreddit
    const subredditElement = element.querySelector('[data-click-id="subreddit"]') ||
                            document.querySelector('meta[property="og:site_name"]');
    const subreddit = subredditElement?.textContent?.trim() ||
                     (subredditElement as HTMLMetaElement)?.content;

    // Extract thumbnail/image
    const imageElement = element.querySelector('img[alt="Post image"]') ||
                        element.querySelector('[data-test-id="post-content"] img');
    const thumbnailUrl = imageElement?.getAttribute('src');

    // Extract score/upvotes
    const scoreElement = element.querySelector('[id*="vote-arrows"] button[aria-label*="upvote"]');
    const scoreText = scoreElement?.getAttribute('aria-label');
    const score = this.parseScore(scoreText);

    // Extract comment count
    const commentsElement = element.querySelector('[data-click-id="comments"]');
    const commentsText = commentsElement?.textContent?.trim();
    const numComments = this.parseCommentCount(commentsText);

    // Extract timestamp
    const timeElement = element.querySelector('time') ||
                       element.querySelector('[data-testid="post_timestamp"]');
    const timestamp = timeElement?.getAttribute('datetime');

    // Build media assets
    const mediaAssets: MediaAsset[] = [];
    if (thumbnailUrl) {
      mediaAssets.push({
        type: 'image',
        url: thumbnailUrl
      });
    }

    return {
      id: this.generateContentId('reddit', postId),
      platform: 'reddit',
      platformContentId: postId,
      url,
      title,
      content,
      author: authorName ? {
        name: authorName,
        username: authorName,
        url: authorHref ? `https://www.reddit.com${authorHref}` : undefined
      } : undefined,
      thumbnailUrl,
      mediaAssets: mediaAssets.length > 0 ? mediaAssets : undefined,
      metadata: {
        subreddit,
        score,
        numComments
      },
      contentCreatedAt: timestamp ? new Date(timestamp) : undefined,
      extractedAt: new Date()
    };
  }

  async extractMetadata(input: string | HTMLElement): Promise<Record<string, any>> {
    if (typeof input === 'string') {
      const metadata = await MetadataExtractor.extractAll(input);
      const oEmbed = await MetadataExtractor.fetchOEmbed(input, 'reddit');

      return {
        openGraph: metadata.openGraph,
        twitterCard: metadata.twitterCard,
        htmlMeta: metadata.htmlMeta,
        oEmbed
      };
    }

    // Extract from DOM
    const postId = this.extractPlatformId(window.location.href);

    return {
      postId,
      pageTitle: document.title,
      url: window.location.href
    };
  }

  /**
   * Normalize Reddit URL to standard format
   */
  private normalizeUrl(url: string): string {
    const postId = this.extractPlatformId(url);
    if (!postId) return url;

    // If it's a short URL, try to expand it
    if (url.includes('redd.it')) {
      // We need to fetch the post to get the full URL
      // For now, return the short URL as-is
      return url;
    }

    // Extract subreddit and slug from full URL
    const match = url.match(/\/r\/([\w]+)\/comments\/([\w]+)\/([\w-]*)/i);
    if (match) {
      const [, subreddit, postIdMatch, slug] = match;
      return `https://www.reddit.com/r/${subreddit}/comments/${postIdMatch}/${slug || ''}`;
    }

    return url;
  }

  /**
   * Get best thumbnail from Reddit data
   */
  private getRedditThumbnail(data: any): string | undefined {
    if (!data) return undefined;

    // Try preview image first
    if (data.preview?.images?.[0]?.source?.url) {
      return this.decodeHtmlEntities(data.preview.images[0].source.url);
    }

    // Try thumbnail
    if (data.thumbnail && data.thumbnail.startsWith('http')) {
      return data.thumbnail;
    }

    // Try URL if it's an image
    if (data.url && /\.(jpg|jpeg|png|gif|webp)$/i.test(data.url)) {
      return data.url;
    }

    return undefined;
  }

  /**
   * Decode HTML entities in Reddit URLs
   */
  private decodeHtmlEntities(text: string): string {
    return text.replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&quot;/g, '"')
               .replace(/&#39;/g, "'");
  }

  /**
   * Parse score from aria-label like "upvote 1234"
   */
  private parseScore(text?: string | null): number | undefined {
    if (!text) return undefined;

    const match = text.match(/\d+/);
    if (!match) return undefined;

    return parseInt(match[0], 10);
  }

  /**
   * Parse comment count from text like "123 Comments"
   */
  private parseCommentCount(text?: string): number | undefined {
    if (!text) return undefined;

    const match = text.match(/(\d+)\s*comment/i);
    if (!match) return undefined;

    return parseInt(match[1], 10);
  }
}
