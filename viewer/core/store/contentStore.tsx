import { create } from "zustand";
import { persist } from "zustand/middleware";
import { LiveViewContentBlockItems, LiveViewContentBlock } from '../content/types';
import { supabase } from "@/utils/supabase/client";
import { Group } from "three";
import { WTF_CONFIG } from "../../config";
import Viewer from "../../viewer";

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

    console.log('setting next column findme');
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
    console.log('setting prev column findme');
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
      console.log('setting next item findme');
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
      console.log('setting prev item findme');
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
      console.error('Error fetching data:', error);
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
            console.error('Invalid URL:', error);
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
    console.log('Next Slide');
    const { maxIndex, activeSlideIndex } = get();
    console.log('Next Slide', maxIndex, activeSlideIndex);
    if (maxIndex !== null && activeSlideIndex !== null) {
      const nextIndex = (activeSlideIndex + 1) > maxIndex ? 0 : activeSlideIndex + 1;
      set({ activeSlideIndex: nextIndex });
    }
  },

  prevSlide() {
    console.log('Prev Slide');
    const { maxIndex, activeSlideIndex } = get();
    console.log('Prev Slide', maxIndex, activeSlideIndex);
    if (maxIndex !== null && activeSlideIndex !== null) {
      const prevIndex = (activeSlideIndex - 1) < 0 ? maxIndex : activeSlideIndex - 1;
      set({ activeSlideIndex: prevIndex });
    }
  },

  fetchLatestEpisode: async () => {
    console.log('Fetching latest Episode')
    const { data, error } = await supabase
      .from('episodes')
      .select('*')
      .order('date', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching data:', error);
      return;
    }

    if (data && data.length > 0) {
      const latestEpisodeId = data[0].id;
      set({ episodeId: latestEpisodeId });
      get().fetchEpisodeContent(latestEpisodeId);
    }
  },
}));







interface TweetStoreState {
  tweets: {[key: string]: any}
  getTweet: (tweet_id: string) => Promise<any>
}

export const useTweetStore = create<TweetStoreState>()(
  persist(
    (set, get) => ({
      tweets: {},

      getTweet: async (tweet_id: string) => {
        console.log('530society TWEETID', tweet_id)
        const tweets = get().tweets

        console.log('poop', { tweets, tweet_id })

        if (tweet_id in tweets) {
          return tweets[tweet_id]
        }

        const { data, error } = await supabase
          .from('tweets')
          .select('*')
          .eq('id', tweet_id)
          .single() // Ensure you only get one tweet

        if (error) {
          console.log('530society test', error)
          // throw new Error(`Error fetching tweet: ${error.message}`)
        }

        if (data) {
          set({ tweets: { ...tweets, [tweet_id]: data } })
          return data
        }

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


