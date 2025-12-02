import { create } from "zustand";
import { persist } from "zustand/middleware";
import { LiveViewContentBlockItems, LiveViewContentBlock } from '../content/types';
import { supabase } from "@/utils/supabase/client";
import { Object3D } from "three";
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
  activeItemObject: Object3D | null;
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
  fetchThisWeekContent: () => Promise<void>;
  fetchRecentContent: () => Promise<void>;
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
      // Calculate date for "last 7 days" filter
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Get all approved content with categories from the last week
      const { data: allContent, error: contentError } = await supabase
        .from('content')
        .select('*')
        .not('category', 'is', null)
        .eq('approval_status', 'approved')
        .gte('submitted_at', oneWeekAgo.toISOString())
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
          news_id: item.id,
          weight: index,
          note: item.description || '',
          content: item
        }));

        contentBlocks.push({
          id: category,
          episode_id: 'latest',
          title: category,
          description: '',
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

  fetchThisWeekContent: async () => {
    logger.debug('Fetching "This Week" content by channel groups')

    try {
      // Calculate last Wednesday 7:30pm EST
      const sinceDate = getLastWednesday730EST();
      logger.log(`Fetching content since ${sinceDate.toISOString()}`);

      // Step 1: Fetch channel groups and channels to build lookup maps
      const { data: groups, error: groupsError } = await supabase
        .from('channel_groups')
        .select('id, slug, name, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (groupsError) {
        logger.error('Error fetching channel groups:', groupsError);
        return;
      }

      const { data: channels, error: channelsError } = await supabase
        .from('channels')
        .select('slug, name, group_id, display_order')
        .eq('is_active', true);

      if (channelsError) {
        logger.error('Error fetching channels:', channelsError);
        return;
      }

      // Build lookup maps
      const groupById = new Map<string, { slug: string; name: string; display_order: number }>();
      groups?.forEach(g => groupById.set(g.id, { slug: g.slug, name: g.name, display_order: g.display_order }));

      const channelToGroup = new Map<string, string>(); // channel_slug → group_slug
      const channelOrder = new Map<string, number>(); // channel_slug → display_order
      const channelNames = new Map<string, string>(); // channel_slug → channel_name
      channels?.forEach(c => {
        const group = groupById.get(c.group_id);
        if (group) {
          channelToGroup.set(c.slug, group.slug);
          channelOrder.set(c.slug, c.display_order);
          channelNames.set(c.slug, c.name);
        }
      });

      logger.debug(`Built lookup maps: ${channelToGroup.size} channels in ${groupById.size} groups`);

      // Step 2: Get all approved content with primary_channel since last Wednesday
      const { data: allContent, error: contentError } = await supabase
        .from('content')
        .select('*')
        .not('primary_channel', 'is', null)
        .eq('approval_status', 'approved')
        .gte('created_at', sinceDate.toISOString())
        .order('created_at', { ascending: false });

      if (contentError) {
        logger.error('Error fetching content:', contentError);
        return;
      }

      if (!allContent || allContent.length === 0) {
        logger.warn('No content found for this week');
        return;
      }

      // Step 3: Group content - preshow by individual channel, others by group
      const contentByGroup = new Map<string, { groupName: string; items: any[] }>();
      const preshowByChannel = new Map<string, { channelName: string; channelOrder: number; items: any[] }>();

      for (const item of allContent) {
        if (!item.primary_channel) continue;

        const groupSlug = channelToGroup.get(item.primary_channel);
        if (!groupSlug) {
          logger.warn(`Channel "${item.primary_channel}" has no group mapping`);
          continue;
        }

        // Preshow content goes into individual channel buckets
        if (groupSlug === 'preshow') {
          if (!preshowByChannel.has(item.primary_channel)) {
            preshowByChannel.set(item.primary_channel, {
              channelName: channelNames.get(item.primary_channel) || item.primary_channel,
              channelOrder: channelOrder.get(item.primary_channel) ?? 999,
              items: []
            });
          }
          preshowByChannel.get(item.primary_channel)!.items.push(item);
        } else {
          // Other content grouped by channel group
          if (!contentByGroup.has(groupSlug)) {
            const group = [...groupById.values()].find(g => g.slug === groupSlug);
            contentByGroup.set(groupSlug, {
              groupName: group?.name || groupSlug,
              items: []
            });
          }
          contentByGroup.get(groupSlug)!.items.push(item);
        }
      }

      // Step 4a: Sort preshow channel items by date
      for (const [channelSlug, channelData] of preshowByChannel.entries()) {
        channelData.items.sort((a: any, b: any) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        // Limit to 20 items per preshow channel
        channelData.items = channelData.items.slice(0, 20);
      }

      // Step 4b: Sort items within each group by channel order, then by date
      for (const [groupSlug, groupData] of contentByGroup.entries()) {
        groupData.items.sort((a: any, b: any) => {
          // Primary sort: by channel display_order
          const orderA = channelOrder.get(a.primary_channel) ?? 999;
          const orderB = channelOrder.get(b.primary_channel) ?? 999;
          if (orderA !== orderB) return orderA - orderB;

          // Secondary sort: by created_at descending (newest first within channel)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        // Limit to 30 items per group (groups have more channels)
        groupData.items = groupData.items.slice(0, 30);
      }

      // Step 5: Build content blocks - preshow channels first, then other groups
      const contentBlocks: LiveViewContentBlock[] = [];
      let blockWeight = 0;

      // Add preshow channels first (sorted by channel display_order)
      const sortedPreshowChannels = [...preshowByChannel.entries()].sort((a, b) => {
        return a[1].channelOrder - b[1].channelOrder;
      });

      for (const [channelSlug, channelData] of sortedPreshowChannels) {
        const content_block_items = channelData.items.map((item: any, index: number) => ({
          id: item.id,
          content_block_id: channelSlug,
          content_id: item.id,
          news_id: item.id,
          weight: index,
          note: item.description || '',
          content: item
        }));

        contentBlocks.push({
          id: channelSlug,
          episode_id: 'this-week',
          title: channelData.channelName,
          weight: blockWeight++,
          description: `preshow:${channelSlug}`, // Mark as preshow channel
          content_block_items: content_block_items as LiveViewContentBlockItems[]
        });
      }

      // Add other groups (sorted by display_order)
      const sortedGroups = [...contentByGroup.entries()].sort((a, b) => {
        const groupA = [...groupById.values()].find(g => g.slug === a[0]);
        const groupB = [...groupById.values()].find(g => g.slug === b[0]);
        return (groupA?.display_order ?? 999) - (groupB?.display_order ?? 999);
      });

      for (const [groupSlug, groupData] of sortedGroups) {
        const content_block_items = groupData.items.map((item: any, index: number) => ({
          id: item.id,
          content_block_id: groupSlug,
          content_id: item.id,
          news_id: item.id,
          weight: index,
          note: item.description || '',
          content: item
        }));

        contentBlocks.push({
          id: groupSlug,
          episode_id: 'this-week',
          title: groupData.groupName,
          weight: blockWeight++,
          description: groupSlug, // Store slug in description for reference
          content_block_items: content_block_items as LiveViewContentBlockItems[]
        });
      }

      logger.log(`Organized ${allContent.length} items: ${preshowByChannel.size} preshow channels, ${contentByGroup.size} groups`);

      // Process the data (same as fetchLatestEpisode)
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

      logger.log(`Loaded ${contentBlocks.length} groups with "This Week" content`);

      // BATCH FETCH ALL TWEETS
      const tweetIds = new Set<string>();
      for (const item of allContent) {
        if (item.platform === 'twitter' && item.platform_content_id) {
          tweetIds.add(item.platform_content_id);
        }
      }

      if (tweetIds.size > 0) {
        logger.log(`Batch fetching ${tweetIds.size} tweets...`);
        const tweetIdArray = Array.from(tweetIds);
        const chunkSize = 100;
        const allTweets: any[] = [];

        for (let i = 0; i < tweetIdArray.length; i += chunkSize) {
          const chunk = tweetIdArray.slice(i, i + chunkSize);
          const { data: tweets, error: tweetsError } = await supabase
            .from('tweets')
            .select('*')
            .in('id', chunk);

          if (tweetsError) {
            logger.error(`Error fetching tweet chunk:`, tweetsError);
          } else if (tweets) {
            allTweets.push(...tweets);
          }
        }

        const tweetMap: {[key: string]: any} = {};
        for (const tweet of allTweets) {
          try {
            tweetMap[tweet.id] = {
              ...tweet,
              data: typeof tweet.data === 'string' ? JSON.parse(tweet.data) : tweet.data
            };
          } catch (error) {
            tweetMap[tweet.id] = {
              id: tweet.id,
              data: {
                text: tweet.text || 'Tweet data unavailable',
                user: {
                  name: tweet.screen_name || 'Unknown',
                  screen_name: tweet.screen_name || 'unknown',
                  profile_image_url_https: tweet.profile_image || ''
                },
                created_at: new Date().toISOString()
              }
            };
          }
        }
        useTweetStore.setState({ tweets: tweetMap });
        logger.log(`Loaded ${Object.keys(tweetMap).length} tweets into store`);
      }

      set({
        maxIndex,
        content: processedData,
        categoryTitles,
        itemTitles,
      })

      get().setIdStrings(processedData)
    } catch (error) {
      logger.error('Error in fetchThisWeekContent:', error);
    }
  },

  fetchRecentContent: async () => {
    logger.debug('Fetching recent content using channel groups from database')

    try {
      // Step 1: Fetch channel groups and channels from database
      const { data: groups, error: groupsError } = await supabase
        .from('channel_groups')
        .select('id, slug, name, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (groupsError) {
        logger.error('Error fetching channel groups:', groupsError);
        return;
      }

      const { data: channels, error: channelsError } = await supabase
        .from('channels')
        .select('slug, name, group_id')
        .eq('is_active', true);

      if (channelsError) {
        logger.error('Error fetching channels:', channelsError);
        return;
      }

      // Build lookup: group_id -> group info, channel_slug -> group_slug
      const groupById = new Map<string, { slug: string; name: string; display_order: number }>();
      groups?.forEach(g => groupById.set(g.id, { slug: g.slug, name: g.name, display_order: g.display_order }));

      const channelToGroup = new Map<string, string>();
      channels?.forEach(c => {
        const group = groupById.get(c.group_id);
        if (group) channelToGroup.set(c.slug.toLowerCase(), group.slug);
      });

      // Also add group slugs as valid matches (for backward compatibility)
      groups?.forEach(g => channelToGroup.set(g.slug.toLowerCase(), g.slug));

      logger.debug(`Built lookup: ${channelToGroup.size} channel/group mappings`);

      // Step 2: Fetch approved content - ordered by created_at (when we added it)
      // This matches the /api/content endpoint behavior
      const { data: allContent, error: contentError } = await supabase
        .from('content')
        .select('*')
        .eq('approval_status', 'approved')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (contentError) {
        logger.error('Error fetching content:', contentError);
        return;
      }

      if (!allContent || allContent.length === 0) {
        logger.warn('No content found');
        return;
      }

      logger.log(`Fetched ${allContent.length} recent content items`);

      // Content is already sorted by created_at from the database query
      const sortedContent = allContent;

      // Group content by category
      const contentByGroup = new Map<string, any[]>();

      // Initialize all groups
      groups?.forEach(g => contentByGroup.set(g.slug, []));

      for (const item of sortedContent) {
        // Check both category field AND primary_channel to find the group
        const categoryField = item.category?.toLowerCase();
        const channelField = item.primary_channel?.toLowerCase();

        // Try to find matching group - check category first, then primary_channel
        let groupSlug = categoryField ? channelToGroup.get(categoryField) : null;
        if (!groupSlug && channelField) {
          groupSlug = channelToGroup.get(channelField);
        }

        // If no match found, put in misc (if misc group exists)
        if (!groupSlug && (categoryField || channelField)) {
          groupSlug = contentByGroup.has('misc') ? 'misc' : null;
        }

        if (groupSlug) {
          const items = contentByGroup.get(groupSlug) || [];
          if (items.length < 10) { // Max 10 per group
            items.push(item);
            contentByGroup.set(groupSlug, items);
          }
        }
      }

      // Build content blocks from groups that have content (in display_order)
      const contentBlocks: LiveViewContentBlock[] = [];
      let blockWeight = 0;

      // Sort groups by display_order
      const sortedGroups = [...(groups || [])].sort((a, b) => a.display_order - b.display_order);

      for (const group of sortedGroups) {
        const items = contentByGroup.get(group.slug) || [];
        if (items.length === 0) continue; // Skip empty groups

        const content_block_items = items.map((item, index) => ({
          id: item.id,
          content_block_id: group.slug,
          content_id: item.id,
          news_id: item.id,
          weight: index,
          note: item.description || '',
          content: item
        }));

        contentBlocks.push({
          id: group.slug,
          episode_id: 'recent',
          title: group.name,
          description: '',
          weight: blockWeight++,
          content_block_items: content_block_items as LiveViewContentBlockItems[]
        });
      }

      if (contentBlocks.length === 0) {
        logger.warn('No content matched any categories');
        return;
      }

      // Process the data (thumbnail URLs)
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

      logger.log(`Loaded ${contentBlocks.length} categories with recent content`);

      // BATCH FETCH ALL TWEETS
      const tweetIds = new Set<string>();
      for (const item of allContent) {
        if ((item.platform === 'twitter' || item.content_type === 'twitter') && (item.platform_content_id || item.content_id)) {
          tweetIds.add(item.platform_content_id || item.content_id);
        }
      }

      if (tweetIds.size > 0) {
        logger.log(`Batch fetching ${tweetIds.size} tweets...`);
        const tweetIdArray = Array.from(tweetIds);
        const chunkSize = 100;
        const allTweets: any[] = [];

        for (let i = 0; i < tweetIdArray.length; i += chunkSize) {
          const chunk = tweetIdArray.slice(i, i + chunkSize);
          const { data: tweets, error: tweetsError } = await supabase
            .from('tweets')
            .select('*')
            .in('id', chunk);

          if (tweetsError) {
            logger.error(`Error fetching tweet chunk:`, tweetsError);
          } else if (tweets) {
            allTweets.push(...tweets);
          }
        }

        const tweetMap: {[key: string]: any} = {};
        for (const tweet of allTweets) {
          try {
            tweetMap[tweet.id] = {
              ...tweet,
              data: typeof tweet.data === 'string' ? JSON.parse(tweet.data) : tweet.data
            };
          } catch (error) {
            tweetMap[tweet.id] = {
              id: tweet.id,
              data: {
                text: tweet.text || 'Tweet data unavailable',
                user: {
                  name: tweet.screen_name || 'Unknown',
                  screen_name: tweet.screen_name || 'unknown',
                  profile_image_url_https: tweet.profile_image || ''
                },
                created_at: new Date().toISOString()
              }
            };
          }
        }
        useTweetStore.setState({ tweets: tweetMap });
        logger.log(`Loaded ${Object.keys(tweetMap).length} tweets into store`);
      }

      set({
        maxIndex,
        content: processedData,
        categoryTitles,
        itemTitles,
      })

      get().setIdStrings(processedData)
    } catch (error) {
      logger.error('Error in fetchRecentContent:', error);
    }
  },
}));

/**
 * Calculate the last Wednesday at 7:30pm EST
 * If current time is Wednesday before 7:30pm EST, returns previous Wednesday
 */
function getLastWednesday730EST(): Date {
  const now = new Date();

  // Convert to EST (UTC-5) - note: this doesn't handle DST perfectly
  // For production, consider using date-fns-tz
  const estOffset = -5 * 60; // EST is UTC-5 in minutes
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const estNow = new Date(utc + (estOffset * 60000));

  const dayOfWeek = estNow.getDay(); // 0 = Sunday, 3 = Wednesday
  let daysBack = dayOfWeek - 3; // Days since Wednesday

  if (daysBack < 0) {
    daysBack += 7; // Go back to previous Wednesday
  }

  // If it's Wednesday but before 7:30pm EST, go back a full week
  if (daysBack === 0) {
    const hours = estNow.getHours();
    const minutes = estNow.getMinutes();
    if (hours < 19 || (hours === 19 && minutes < 30)) {
      daysBack = 7;
    }
  }

  // Calculate last Wednesday at 7:30pm EST
  const lastWed = new Date(estNow);
  lastWed.setDate(lastWed.getDate() - daysBack);
  lastWed.setHours(19, 30, 0, 0);

  // Convert back to UTC for the database query
  return new Date(lastWed.getTime() - (estOffset * 60000));
}







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


