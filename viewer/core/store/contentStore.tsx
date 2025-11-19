import { create } from "zustand";
import { persist } from "zustand/middleware";
import { LiveViewContentBlockItems, LiveViewContentBlock } from '../content/types';
import { supabase } from "@/utils/supabase/client";
import { Group } from "three";
import { WTF_CONFIG } from "../../config";
import Viewer from "../../viewer";
import logger from "../../utils/logger";
import { VideoLoadingState } from '../video/VideoPreloadManager';

interface ContentStoreState {
  episodeId: string | null;
  isAnimating: boolean;
  activeCategoryId: string;
  activeItemId: string;
  categoryIds: string[];
  categoryTitles: string[];
  itemIds: string[][];
  itemTitles: string[][];
  activeCategoryIndex: number;
  activeItemIndex: number;
  activeItemObject: Group | null;
  isContentVideo: boolean;
  isVideoSeeking: boolean;
  videoSeekTime: number;
  videoDuration: number;
  activeItemData: LiveViewContentBlockItems | null;
  content: LiveViewContentBlock[];
  maxIndex: number | null;
  activeSlideIndex: number;
  focusedSlideIndex: number;
  // Video preloading state
  preloadedVideos: Map<string, VideoLoadingState>;
  getVideoForItem: (itemId: string) => VideoLoadingState | null;
  setIdStrings: (contents: LiveViewContentBlock[]) => void;
  setNextColumn: () => void;
  setPrevColumn: () => void;
  setNextItem: () => void;
  setPrevItem: () => void;
  fetchEpisodeContent: (episodeId: string) => Promise<void>;
  nextSlide: () => void;
  prevSlide: () => void;
  fetchLatestEpisode: () => Promise<void>;
}

export const useContentStore = create<ContentStoreState>()((set, get) => ({
  episodeId: '4902fc1b-cf21-4f98-b696-1926393eb37f',
  isAnimating: false,
  activeCategoryId: '',
  activeItemId: '',
  categoryIds: [],
  categoryTitles: [],
  itemIds: [],
  itemTitles: [],
  activeCategoryIndex: 0,
  activeItemIndex: 0,
  activeItemObject: null,
  activeItemData: null,
  isContentVideo: false,
  isVideoSeeking: false,
  videoSeekTime: 0,
  videoDuration: 0,
  content: [],
  maxIndex: null,
  activeSlideIndex: 0,
  focusedSlideIndex: 0,
  // Video preloading state
  preloadedVideos: new Map(),
  getVideoForItem: (itemId: string) => {
    return get().preloadedVideos.get(itemId) || null;
  },

  setIdStrings: (contents: LiveViewContentBlock[]) => {
    if (!contents || contents.length === 0) return;
    const categoryIds = contents.map(content => content.id);
    const itemIds = contents.map(content => content.content_block_items.map(item => item.content.content_id));
    set({ categoryIds, itemIds });
  },

  setNextColumn: () => {
    const { activeCategoryIndex, categoryIds, itemIds } = get();
    const nextCategoryIndex = (activeCategoryIndex + 1) % categoryIds.length;
    const nextCategoryId = categoryIds[nextCategoryIndex];
    const firstItemInNextCategory = itemIds[nextCategoryIndex][0];

    logger.debug('Setting next column', { nextCategoryIndex, nextCategoryId });
    set({
      activeCategoryIndex: nextCategoryIndex,
      activeCategoryId: nextCategoryId,
      activeItemIndex: 0,
      activeItemId: firstItemInNextCategory
    });
  },

  setPrevColumn: () => {
    const { activeCategoryIndex, categoryIds, itemIds } = get();
    const prevCategoryIndex = (activeCategoryIndex - 1 + categoryIds.length) % categoryIds.length;
    const prevCategoryId = categoryIds[prevCategoryIndex];
    const lastItemInPrevCategory = itemIds[prevCategoryIndex][itemIds[prevCategoryIndex].length - 1];
    logger.debug('Setting prev column', { prevCategoryIndex, prevCategoryId });
    set({
      activeCategoryIndex: prevCategoryIndex,
      activeCategoryId: prevCategoryId,
      activeItemIndex: itemIds[prevCategoryIndex].length - 1,
      activeItemId: lastItemInPrevCategory
    });
  },

  setNextItem: () => {
    const { activeCategoryIndex, activeItemIndex, itemIds } = get();
    const currentCategoryItems = itemIds[activeCategoryIndex];

    if (activeItemIndex < currentCategoryItems.length - 1) {
      const nextItemId = currentCategoryItems[activeItemIndex + 1];
      logger.debug('Setting next item', { nextItemId });
      set({
        activeItemIndex: activeItemIndex + 1,
        activeItemId: nextItemId
      });
    } else {
      // Move to the next category's first item
      get().setNextColumn();
    }
  },

  setPrevItem: () => {
    const { activeCategoryIndex, activeItemIndex, itemIds } = get();

    if (activeItemIndex > 0) {
      const prevItemId = itemIds[activeCategoryIndex][activeItemIndex - 1];
      logger.debug('Setting prev item', { prevItemId });
      set({
        activeItemIndex: activeItemIndex - 1,
        activeItemId: prevItemId
      });
    } else {
      // Move to the previous category's last item
      get().setPrevColumn();
    }
  },

  fetchEpisodeContent: async (episodeId: string) => {
    const { data, error } = await supabase
      .from('content_blocks')
      .select(`
        *,
        content_block_items (
          *,
          content (*)
        )
      `)
      .eq('episode_id', episodeId)
      .order('weight', { ascending: true });

    if (error) {
      logger.error('Error fetching data:', error);
      return;
    }

    // Sort content_block_items by weight and filter out undefined items
    const sortedData: LiveViewContentBlock[] = data.map((block: LiveViewContentBlock) => ({
      ...block,
      content_block_items: block.content_block_items
        .filter((item): item is LiveViewContentBlockItems => item !== undefined)
        .sort((a, b) => a.weight - b.weight),
    }));

    let maxIndex = 0;
    sortedData.forEach(block => {
      maxIndex++;
      maxIndex += (block.content_block_items.length - 1);
    });

    const processedData: LiveViewContentBlock[] = sortedData.map(block => {
      const processed_content_block_items = block.content_block_items.map(item => {
        if (item?.content?.thumbnail_url) {
          try {
            const urlObj = new URL(item.content.thumbnail_url);
            const pathname = urlObj.pathname;
            const filename = pathname.substring(pathname.lastIndexOf('/') + 1);

            const filepath = WTF_CONFIG.useRelativeImagePaths
              ? `/thumbnails/${filename}`
              : urlObj.href

            return {
              ...item,
              content: {
                ...item.content,
                thumbnail_url: filepath,
              },
            };
          } catch (error) {
            logger.error('Invalid URL:', error);
            return item; // Return the original item if there's an error
          }
        }
        return item; // Return original item if there's no thumbnail URL
      });

      return {
        ...block,
        content_block_items: processed_content_block_items,
      };
    });

    const categoryTitles = processedData.map(block => block.title);
    const itemTitles = processedData.map(block => block.content_block_items.map(item => item.note));

    set({
      maxIndex,
      content: processedData,
      categoryTitles,
      itemTitles,
    })

    get().setIdStrings(processedData)
  },

  nextSlide() {
    logger.debug('Next Slide');
    const { maxIndex, activeSlideIndex } = get();
    logger.debug('Next Slide', maxIndex, activeSlideIndex);
    if (maxIndex !== null && activeSlideIndex !== null) {
      const nextIndex = (activeSlideIndex + 1) > maxIndex ? 0 : activeSlideIndex + 1;
      set({ activeSlideIndex: nextIndex });
    }
  },

  prevSlide() {
    logger.debug('Prev Slide');
    const { maxIndex, activeSlideIndex } = get();
    logger.debug('Prev Slide', maxIndex, activeSlideIndex);
    if (maxIndex !== null && activeSlideIndex !== null) {
      const prevIndex = (activeSlideIndex - 1) < 0 ? maxIndex : activeSlideIndex - 1;
      set({ activeSlideIndex: prevIndex });
    }
  },

  fetchLatestEpisode: async () => {
    logger.debug('Fetching latest content by category')

    try {
      // Get all content with categories
      const { data: allContent, error: contentError } = await supabase
        .from('content')
        .select('*')
        .not('category', 'is', null)
        .order('submitted_at', { ascending: false });

      if (contentError) {
        logger.error('Error fetching content:', contentError);
        return;
      }

      if (!allContent || allContent.length === 0) {
        logger.warn('No content found');
        return;
      }

      // Group content by category and take top 20 per category
      const contentByCategory = new Map<string, any[]>();

      for (const item of allContent) {
        if (!item.category) continue;

        if (!contentByCategory.has(item.category)) {
          contentByCategory.set(item.category, []);
        }

        const categoryItems = contentByCategory.get(item.category)!;
        if (categoryItems.length < 20) {
          categoryItems.push(item);
        }
      }

      // Transform into content blocks
      const contentBlocks: LiveViewContentBlock[] = [];
      let blockWeight = 0;

      for (const [category, items] of contentByCategory.entries()) {
        const content_block_items = items.map((item, index) => ({
          id: item.id,
          content_block_id: category,
          content_id: item.id,
          weight: index,
          note: item.description || '',
          content: item
        }));

        contentBlocks.push({
          id: category,
          episode_id: 'latest',
          title: category,
          weight: blockWeight++,
          content_block_items: content_block_items as LiveViewContentBlockItems[]
        });
      }

      // Sort blocks alphabetically by title
      contentBlocks.sort((a, b) => a.title.localeCompare(b.title));

      // Process the data (same as fetchEpisodeContent)
      let maxIndex = 0;
      contentBlocks.forEach(block => {
        maxIndex++;
        maxIndex += (block.content_block_items.length - 1);
      });

      const processedData: LiveViewContentBlock[] = contentBlocks.map(block => {
        const processed_content_block_items = block.content_block_items.map(item => {
          if (item?.content?.thumbnail_url) {
            try {
              const urlObj = new URL(item.content.thumbnail_url);
              const pathname = urlObj.pathname;
              const filename = pathname.substring(pathname.lastIndexOf('/') + 1);

              const filepath = WTF_CONFIG.useRelativeImagePaths
                ? `/thumbnails/${filename}`
                : urlObj.href

              return {
                ...item,
                content: {
                  ...item.content,
                  thumbnail_url: filepath,
                },
              };
            } catch (error) {
              logger.error('Invalid URL:', error);
              return item;
            }
          }
          return item;
        });

        return {
          ...block,
          content_block_items: processed_content_block_items,
        };
      });

      const categoryTitles = processedData.map(block => block.title);
      const itemTitles = processedData.map(block => block.content_block_items.map(item => item.note));

      logger.log(`Loaded ${contentBlocks.length} categories with content`);

      // BATCH FETCH ALL TWEETS (reduces N+1 queries)
      // Extract all tweet IDs from content items
      const tweetIds = new Set<string>();
      for (const item of allContent) {
        if (item.content_type === 'twitter' && item.content_id) {
          tweetIds.add(item.content_id);
        }
      }

      // Batch query tweets in chunks to avoid URL length limits
      if (tweetIds.size > 0) {
        logger.log(`Batch fetching ${tweetIds.size} tweets in chunks...`);
        const tweetIdArray = Array.from(tweetIds);
        const chunkSize = 100; // Fetch 100 tweets per request
        const allTweets: any[] = [];

        // Split tweet IDs into chunks and fetch each chunk
        for (let i = 0; i < tweetIdArray.length; i += chunkSize) {
          const chunk = tweetIdArray.slice(i, i + chunkSize);
          const { data: tweets, error: tweetsError } = await supabase
            .from('tweets')
            .select('*')
            .in('id', chunk);

          if (tweetsError) {
            logger.error(`Error fetching tweet chunk ${i / chunkSize + 1}:`, tweetsError);
          } else if (tweets) {
            allTweets.push(...tweets);
          }
        }

        // Store all tweets in tweetStore for synchronous lookup
        // Parse JSON data field since it's stored as TEXT
        const tweetMap: {[key: string]: any} = {};
        let parseErrors = 0;
        for (const tweet of allTweets) {
          try {
            tweetMap[tweet.id] = {
              ...tweet,
              data: typeof tweet.data === 'string' ? JSON.parse(tweet.data) : tweet.data
            };
          } catch (error) {
            // Store minimal fallback data so getTweet() doesn't return null
            parseErrors++;
            tweetMap[tweet.id] = {
              id: tweet.id,
              data: {
                text: tweet.text || 'Tweet data unavailable due to parsing error',
                user: {
                  name: tweet.screen_name || 'Unknown',
                  screen_name: tweet.screen_name || 'unknown',
                  profile_image_url_https: tweet.profile_image || ''
                },
                created_at: new Date().toISOString(),
                __parse_error: true  // Flag for debugging
              }
            };

            // Only log parse errors when verbose logging is enabled
            logger.debug(`Failed to parse tweet ${tweet.id}, using fallback data`);
          }
        }
        useTweetStore.setState({ tweets: tweetMap });
        logger.log(`Loaded ${Object.keys(tweetMap).length} tweets into store (${Math.ceil(tweetIdArray.length / chunkSize)} chunks)${parseErrors > 0 ? `, ${parseErrors} with parse errors (using fallback)` : ''}`);
      }

      set({
        maxIndex,
        content: processedData,
        categoryTitles,
        itemTitles,
      })

      get().setIdStrings(processedData)
    } catch (error) {
      logger.error('Error in fetchLatestEpisode:', error);
    }
  },
}));







interface TweetStoreState {
  tweets: {[key: string]: any}
  getTweet: (tweet_id: string) => any
}

export const useTweetStore = create<TweetStoreState>()(
  persist(
    (set, get) => ({
      tweets: {},

      getTweet: (tweet_id: string) => {
        // Synchronous lookup from pre-loaded tweets (loaded via batch fetch)
        const tweets = get().tweets

        if (tweet_id in tweets) {
          return tweets[tweet_id]
        }

        // Tweet not found in store - should have been batch loaded
        logger.warn(`Tweet ${tweet_id} not found in store. Was it batch loaded?`)
        return null
      },
    }),
    {
      name: 'tweet-store'
    }
  )
)



// Keep old export for backwards compatibility during migration
export const ContentStore = useContentStore;
export default useContentStore


