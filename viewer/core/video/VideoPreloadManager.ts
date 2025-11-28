/**
 * VideoPreloadManager
 *
 * Manages a pool of 3 preloaded video elements (previous, current, next slides)
 * for instant playback and smooth transitions.
 *
 * Features:
 * - Maintains pool of 3 concurrent video elements
 * - Tracks loading states and progress
 * - Automatically preloads adjacent slides
 * - Memory-efficient disposal of unused videos
 * - Network-aware preloading (WiFi vs cellular)
 */

import { useContentStore, useTweetStore } from '../store/contentStore';
import { LiveViewContentBlockItems } from '../content/types';
import { extractVideoUrls } from '../content/utils';
import logger from '../../utils/logger';

export interface VideoLoadingState {
  itemId: string;
  videoUrl: string;
  status: 'idle' | 'loading' | 'loaded' | 'error';
  progress: number; // 0-1 for buffering progress
  videoElement: HTMLVideoElement | null;
  error?: string;
  retryCount?: number;
}

interface SlidePosition {
  categoryIndex: number;
  itemIndex: number;
}

class VideoPreloadManager {
  private preloadedVideos: Map<string, VideoLoadingState> = new Map();
  private maxConcurrentVideos = 3;
  private maxRetries = 2; // Maximum retry attempts for failed videos
  private isInitialized = false;
  private unsubscribe: (() => void) | null = null;
  private isMobile = false;
  private isOnWiFi = true;
  private blacklistedUrls: Map<string, string> = new Map(); // URL -> error reason
  private failedItems: Set<string> = new Set(); // Track permanently failed item IDs

  /**
   * Check if URL is permanently blacklisted or should be blacklisted
   */
  private isBlacklistedUrl(url: string): boolean {
    if (this.blacklistedUrls.has(url)) {
      return true;
    }

    // Detect YouTube URLs (can't be embedded directly due to CORS)
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      this.blacklistedUrls.set(url, 'YouTube URLs cannot be embedded directly (CORS)');
      logger.warn(`Blacklisted YouTube URL: ${url}`);
      return true;
    }

    return false;
  }

  /**
   * Detect if device is mobile
   */
  private detectMobile(): boolean {
    if (typeof window === 'undefined') return false;

    // Check user agent
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUA = /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

    // Check screen size
    const isSmallScreen = window.innerWidth <= 768;

    return isMobileUA || isSmallScreen;
  }

  /**
   * Detect network connection type
   */
  private detectNetworkType(): boolean {
    if (typeof window === 'undefined' || !('connection' in navigator)) {
      return true; // Assume WiFi if can't detect
    }

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    if (!connection) return true;

    // Check if on cellular network
    const effectiveType = connection.effectiveType;
    const isCellular = effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g';

    return !isCellular; // Return true if on WiFi/fast connection
  }

  /**
   * Initialize the preload manager and subscribe to content store changes
   */
  initialize() {
    if (this.isInitialized) {
      logger.warn('VideoPreloadManager already initialized');
      return;
    }

    // Detect device and network capabilities
    this.isMobile = this.detectMobile();
    this.isOnWiFi = this.detectNetworkType();

    // Adjust pool size based on device
    if (this.isMobile) {
      this.maxConcurrentVideos = this.isOnWiFi ? 2 : 1; // Reduce on mobile
      logger.log('VideoPreloadManager: Mobile detected, pool size:', this.maxConcurrentVideos);
    } else {
      this.maxConcurrentVideos = 3; // Full pool on desktop
    }

    logger.log('VideoPreloadManager initialized', {
      isMobile: this.isMobile,
      isOnWiFi: this.isOnWiFi,
      maxConcurrentVideos: this.maxConcurrentVideos,
    });

    this.isInitialized = true;

    // Subscribe to active slide changes
    this.unsubscribe = useContentStore.subscribe(
      (state) => ({
        activeCategoryIndex: state.activeCategoryIndex,
        activeItemIndex: state.activeItemIndex,
        content: state.content,
      }),
      () => {
        this.updatePreloadQueue();
      }
    );

    // Initial preload
    this.updatePreloadQueue();
  }

  /**
   * Clean up and unsubscribe
   */
  destroy() {
    logger.log('VideoPreloadManager destroyed');
    this.unsubscribe?.();
    this.disposeAllVideos();
    this.isInitialized = false;
  }

  /**
   * Convert 2D position (category, item) to global slide index
   */
  private getSlideIndexFromPosition(categoryIndex: number, itemIndex: number): number {
    const { content } = useContentStore.getState();
    let slideIndex = 0;

    for (let i = 0; i < categoryIndex; i++) {
      slideIndex++; // Category header counts as a slide
      slideIndex += content[i].content_block_items.length - 1;
    }

    slideIndex++; // Current category header
    slideIndex += itemIndex;

    return slideIndex;
  }

  /**
   * Convert global slide index to 2D position (category, item)
   */
  private getPositionFromSlideIndex(slideIndex: number): SlidePosition {
    const { content } = useContentStore.getState();
    let currentIndex = 0;

    for (let categoryIndex = 0; categoryIndex < content.length; categoryIndex++) {
      const categoryItems = content[categoryIndex].content_block_items;
      const categoryEndIndex = currentIndex + 1 + categoryItems.length - 1;

      if (slideIndex <= categoryEndIndex) {
        const itemIndex = slideIndex - currentIndex - 1;
        return { categoryIndex, itemIndex: Math.max(0, itemIndex) };
      }

      currentIndex = categoryEndIndex + 1;
    }

    return { categoryIndex: 0, itemIndex: 0 };
  }

  /**
   * Get the content item at a specific position
   */
  private getItemAtPosition(categoryIndex: number, itemIndex: number): LiveViewContentBlockItems | null {
    const { content } = useContentStore.getState();

    if (categoryIndex >= 0 && categoryIndex < content.length) {
      const items = content[categoryIndex].content_block_items;
      if (itemIndex >= 0 && itemIndex < items.length) {
        return items[itemIndex];
      }
    }

    return null;
  }

  /**
   * Get video URL for a content item (supports video and twitter content types)
   */
  private getVideoUrlForItem(item: LiveViewContentBlockItems | null): string | null {
    if (!item) return null;

    // Direct video content
    if (item.content.content_type === 'video') {
      return item.content.content_url || null;
    }

    // Twitter video
    if (item.content.content_type === 'twitter') {
      const tweet = useTweetStore.getState().getTweet(item.content.content_id);
      if (tweet) {
        const videoUrls = extractVideoUrls(tweet);
        return videoUrls.length > 0 ? videoUrls[0] : null;
      }
    }

    return null;
  }

  /**
   * Calculate adjacent slides (prev, current, next)
   */
  private getAdjacentSlides(): { prev: SlidePosition; current: SlidePosition; next: SlidePosition } {
    const { activeCategoryIndex, activeItemIndex, maxIndex } = useContentStore.getState();

    if (maxIndex === null) {
      const current = { categoryIndex: activeCategoryIndex, itemIndex: activeItemIndex };
      return { prev: current, current, next: current };
    }

    const currentSlideIndex = this.getSlideIndexFromPosition(activeCategoryIndex, activeItemIndex);
    const prevSlideIndex = (currentSlideIndex - 1) < 0 ? maxIndex : currentSlideIndex - 1;
    const nextSlideIndex = (currentSlideIndex + 1) > maxIndex ? 0 : currentSlideIndex + 1;

    return {
      prev: this.getPositionFromSlideIndex(prevSlideIndex),
      current: { categoryIndex: activeCategoryIndex, itemIndex: activeItemIndex },
      next: this.getPositionFromSlideIndex(nextSlideIndex),
    };
  }

  /**
   * Update the preload queue based on current active slide
   */
  private updatePreloadQueue() {
    const { content } = useContentStore.getState();

    if (!content || content.length === 0) {
      logger.debug('No content available for preloading');
      return;
    }

    const adjacentSlides = this.getAdjacentSlides();
    const positions = [adjacentSlides.prev, adjacentSlides.current, adjacentSlides.next];

    // Get items for each position
    const itemsToPreload = positions
      .map(pos => this.getItemAtPosition(pos.categoryIndex, pos.itemIndex))
      .filter((item): item is LiveViewContentBlockItems => item !== null);

    // Get item IDs that should be preloaded
    const itemIdsToKeep = new Set(itemsToPreload.map(item => item.id));

    // Dispose videos not in the preload window
    for (const [itemId, state] of this.preloadedVideos.entries()) {
      if (!itemIdsToKeep.has(itemId)) {
        logger.debug(`Disposing video outside preload window: ${itemId}`);
        this.disposeVideo(itemId);
      }
    }

    // Preload videos for adjacent slides
    for (const item of itemsToPreload) {
      const videoUrl = this.getVideoUrlForItem(item);

      if (videoUrl && !this.preloadedVideos.has(item.id)) {
        this.preloadVideo(item.id, videoUrl);
      }
    }

    logger.debug('Preload queue updated', {
      current: itemsToPreload[1]?.id || 'none',
      preloaded: Array.from(this.preloadedVideos.keys()),
    });
  }

  /**
   * Preload a video element
   */
  private preloadVideo(itemId: string, videoUrl: string, retryCount: number = 0) {
    // Check if item has permanently failed before
    if (this.failedItems.has(itemId)) {
      logger.debug(`Skipping permanently failed item: ${itemId}`);
      return;
    }

    // Check if URL is blacklisted
    if (this.isBlacklistedUrl(videoUrl)) {
      const reason = this.blacklistedUrls.get(videoUrl);
      logger.warn(`Skipping blacklisted URL for ${itemId}: ${reason}`);
      this.failedItems.add(itemId);
      this.updateLoadingState(itemId, {
        status: 'error',
        error: reason || 'URL is blacklisted',
      });
      return;
    }

    // Skip preloading on mobile devices with cellular connection
    if (this.isMobile && !this.isOnWiFi) {
      logger.debug(`Skipping preload on cellular network: ${itemId}`);
      return;
    }

    // Check memory limit
    if (this.preloadedVideos.size >= this.maxConcurrentVideos) {
      logger.warn(`Max concurrent videos reached (${this.maxConcurrentVideos}), skipping preload`);
      return;
    }

    logger.debug(`Preloading video: ${itemId} (attempt ${retryCount + 1}/${this.maxRetries + 1})`, { url: videoUrl });

    // Create video element
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    // Initialize loading state
    const loadingState: VideoLoadingState = {
      itemId,
      videoUrl,
      status: 'loading',
      progress: 0,
      videoElement: video,
      retryCount,
    };

    this.preloadedVideos.set(itemId, loadingState);

    // Track loading progress
    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const duration = video.duration;
        const progress = duration > 0 ? bufferedEnd / duration : 0;

        this.updateLoadingState(itemId, { progress });
        logger.debug(`Video preload progress: ${itemId}`, { progress: Math.round(progress * 100) + '%' });
      }
    };

    const handleCanPlay = () => {
      logger.debug(`Video ready to play: ${itemId}`);
      this.updateLoadingState(itemId, { status: 'loaded', progress: 1 });
    };

    const handleError = (error: Event) => {
      const currentState = this.preloadedVideos.get(itemId);
      const currentRetryCount = currentState?.retryCount || 0;

      // Detect CORS errors (permanent failure - no retry)
      const errorTarget = error.target as HTMLVideoElement;
      const errorMessage = errorTarget?.error?.message || '';
      const isCorsError =
        errorMessage.includes('CORS') ||
        errorMessage.includes('cross-origin') ||
        error.type === 'error';

      if (isCorsError || errorMessage.includes('ERR_FAILED')) {
        logger.error(`Permanent video error (CORS/Network) for ${itemId}, blacklisting URL`);
        this.blacklistedUrls.set(videoUrl, 'CORS or network error');
        this.failedItems.add(itemId);

        // Clean up
        video.removeEventListener('progress', handleProgress);
        video.removeEventListener('canplaythrough', handleCanPlay);
        video.removeEventListener('error', handleError);

        this.updateLoadingState(itemId, {
          status: 'error',
          error: 'Video cannot be loaded (CORS/Network error)',
        });
        return;
      }

      // Check if we should retry
      if (currentRetryCount < this.maxRetries) {
        const nextRetryCount = currentRetryCount + 1;
        const delay = Math.min(1000 * Math.pow(2, currentRetryCount), 5000); // Exponential backoff, max 5s

        logger.warn(`Video preload error: ${itemId} (attempt ${nextRetryCount}/${this.maxRetries + 1}), retrying in ${delay}ms`);

        // Clean up current attempt
        video.removeEventListener('progress', handleProgress);
        video.removeEventListener('canplaythrough', handleCanPlay);
        video.removeEventListener('error', handleError);
        video.src = '';

        // Retry after delay
        setTimeout(() => {
          this.disposeVideo(itemId);
          this.preloadVideo(itemId, videoUrl, nextRetryCount);
        }, delay);
      } else {
        // Max retries exceeded - permanent failure
        logger.error(`Video preload failed after ${currentRetryCount + 1} attempts: ${itemId}, permanently failed`);
        this.failedItems.add(itemId);

        // Clean up
        video.removeEventListener('progress', handleProgress);
        video.removeEventListener('canplaythrough', handleCanPlay);
        video.removeEventListener('error', handleError);

        this.updateLoadingState(itemId, {
          status: 'error',
          error: 'Failed to load video after multiple attempts',
        });
      }
    };

    video.addEventListener('progress', handleProgress);
    video.addEventListener('canplaythrough', handleCanPlay);
    video.addEventListener('error', handleError);

    // Start loading
    video.load();
  }

  /**
   * Update loading state for a video
   */
  private updateLoadingState(itemId: string, updates: Partial<VideoLoadingState>) {
    const state = this.preloadedVideos.get(itemId);
    if (state) {
      this.preloadedVideos.set(itemId, { ...state, ...updates });
    }
  }

  /**
   * Dispose a video element
   */
  private disposeVideo(itemId: string) {
    const state = this.preloadedVideos.get(itemId);

    if (state?.videoElement) {
      state.videoElement.pause();
      state.videoElement.src = '';
      state.videoElement.load();
      state.videoElement.remove();
    }

    this.preloadedVideos.delete(itemId);
  }

  /**
   * Dispose all video elements
   */
  private disposeAllVideos() {
    for (const itemId of this.preloadedVideos.keys()) {
      this.disposeVideo(itemId);
    }
  }

  /**
   * Get preloaded video for an item
   */
  getVideoForItem(itemId: string): VideoLoadingState | null {
    return this.preloadedVideos.get(itemId) || null;
  }

  /**
   * Get all preloaded videos (for debugging)
   */
  getAllPreloadedVideos(): Map<string, VideoLoadingState> {
    return new Map(this.preloadedVideos);
  }

  /**
   * Check if video is preloaded and ready
   */
  isVideoReady(itemId: string): boolean {
    const state = this.preloadedVideos.get(itemId);
    return state?.status === 'loaded';
  }
}

// Singleton instance
export const videoPreloadManager = new VideoPreloadManager();

export default videoPreloadManager;
