import { createStore } from "zustand-x";
import { LiveViewContentBlockItems, LiveViewContentBlock } from './types';
import { supabase } from "@/lib/supabase";
import { Group } from "three";
import { WTF_CONFIG } from "../config";

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
  activeItemData: LiveViewContentBlockItems | null;
  content: LiveViewContentBlock[];
  maxIndex: number | null;
  activeSlideIndex: number;
  focusedSlideIndex: number;
}

export const ContentStore = createStore<ContentStoreState>({
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
  content: [],
  maxIndex: null,
  activeSlideIndex: 0,
  focusedSlideIndex: 0,
}, {
  name: 'wtf-content-store'
}).extendActions(({ set, get }) => ({

  /**
   * Initialize content store with external data (props-based)
   * This replaces the old fetchEpisodeContent/fetchLatestEpisode pattern
   */
  setContent: (contents: LiveViewContentBlock[]) => {
    if (!contents || contents.length === 0) {
      console.warn('ContentStore.setContent: No content provided');
      return;
    }

    // Process content data
    let maxIndex = 0;
    contents.forEach(block => {
      maxIndex++;
      maxIndex += (block.content_block_items.length - 1);
    });

    const categoryTitles = contents.map(block => block.title);
    const itemTitles = contents.map(block => block.content_block_items.map(item => item.note));
    const categoryIds = contents.map(content => content.id);
    const itemIds = contents.map(content => content.content_block_items.map(item => item.content.content_id));

    set('content', contents);
    set('maxIndex', maxIndex);
    set('categoryTitles', categoryTitles);
    set('itemTitles', itemTitles);
    set('categoryIds', categoryIds);
    set('itemIds', itemIds);
  },

  /**
   * Set initial active category and item
   */
  setInitialActive: (categoryId?: string, itemId?: string) => {
    const content = get('content');
    if (!content || content.length === 0) return;

    // If no categoryId provided, use first category
    const targetCategoryId = categoryId || content[0].id;
    const categoryIndex = content.findIndex(c => c.id === targetCategoryId);

    if (categoryIndex === -1) {
      console.warn('ContentStore.setInitialActive: Category not found, using first category');
      const firstCategory = content[0];
      const firstItem = firstCategory.content_block_items[0];

      set('activeCategoryId', firstCategory.id);
      set('activeCategoryIndex', 0);
      set('activeItemId', firstItem?.content?.content_id || '');
      set('activeItemIndex', 0);
      set('activeItemData', firstItem || null);
      return;
    }

    const targetCategory = content[categoryIndex];

    // If no itemId provided, use first item in category
    if (!itemId) {
      const firstItem = targetCategory.content_block_items[0];
      set('activeCategoryId', targetCategoryId);
      set('activeCategoryIndex', categoryIndex);
      set('activeItemId', firstItem?.content?.content_id || '');
      set('activeItemIndex', 0);
      set('activeItemData', firstItem || null);
      return;
    }

    // Find the specific item
    const itemIndex = targetCategory.content_block_items.findIndex(
      item => item.content.content_id === itemId
    );

    if (itemIndex === -1) {
      console.warn('ContentStore.setInitialActive: Item not found, using first item');
      const firstItem = targetCategory.content_block_items[0];
      set('activeCategoryId', targetCategoryId);
      set('activeCategoryIndex', categoryIndex);
      set('activeItemId', firstItem?.content?.content_id || '');
      set('activeItemIndex', 0);
      set('activeItemData', firstItem || null);
      return;
    }

    const targetItem = targetCategory.content_block_items[itemIndex];
    set('activeCategoryId', targetCategoryId);
    set('activeCategoryIndex', categoryIndex);
    set('activeItemId', itemId);
    set('activeItemIndex', itemIndex);
    set('activeItemData', targetItem);
  },

  setIdStrings: (contents: LiveViewContentBlock[]) => {
    if (!contents || contents.length === 0) return;
    const categoryIds = contents.map(content => content.id);
    const itemIds = contents.map(content => content.content_block_items.map(item => item.content.content_id));
    set('categoryIds', categoryIds);
    set('itemIds', itemIds);
  },

  setNextColumn: () => {
    const activeCategoryIndex = get('activeCategoryIndex');
    const categoryIds = get('categoryIds');
    const itemIds = get('itemIds');
    const nextCategoryIndex = (activeCategoryIndex + 1) % categoryIds.length;
    const nextCategoryId = categoryIds[nextCategoryIndex];
    const firstItemInNextCategory = itemIds[nextCategoryIndex][0];

    console.log('setting next column findme');
    set('activeCategoryIndex', nextCategoryIndex);
    set('activeCategoryId', nextCategoryId);
    set('activeItemIndex', 0);
    set('activeItemId', firstItemInNextCategory);
  },

  setPrevColumn: () => {
    const activeCategoryIndex = get('activeCategoryIndex');
    const categoryIds = get('categoryIds');
    const itemIds = get('itemIds');
    const prevCategoryIndex = (activeCategoryIndex - 1 + categoryIds.length) % categoryIds.length;
    const prevCategoryId = categoryIds[prevCategoryIndex];
    const lastItemInPrevCategory = itemIds[prevCategoryIndex][itemIds[prevCategoryIndex].length - 1];
    console.log('setting prev column findme');
    set('activeCategoryIndex', prevCategoryIndex);
    set('activeCategoryId', prevCategoryId);
    set('activeItemIndex', itemIds[prevCategoryIndex].length - 1);
    set('activeItemId', lastItemInPrevCategory);
  },

  setNextItem: () => {
    const activeCategoryIndex = get('activeCategoryIndex');
    const activeItemIndex = get('activeItemIndex');
    const itemIds = get('itemIds');
    const currentCategoryItems = itemIds[activeCategoryIndex];

    if (activeItemIndex < currentCategoryItems.length - 1) {
      const nextItemId = currentCategoryItems[activeItemIndex + 1];
      console.log('setting next item findme');
      set('activeItemIndex', activeItemIndex + 1);
      set('activeItemId', nextItemId);
    } else {
      // Move to the next category's first item
      ContentStore.set('setNextColumn');
    }
  },

  setPrevItem: () => {
    const activeCategoryIndex = get('activeCategoryIndex');
    const activeItemIndex = get('activeItemIndex');
    const itemIds = get('itemIds');

    if (activeItemIndex > 0) {
      const prevItemId = itemIds[activeCategoryIndex][activeItemIndex - 1];
      console.log('setting prev item findme');
      set('activeItemIndex', activeItemIndex - 1);
      set('activeItemId', prevItemId);
    } else {
      // Move to the previous category's last item
      ContentStore.set('setPrevColumn');
    }
  },

  // Legacy method - not used in props-based API approach
  // Use setContent() instead
  fetchEpisodeContent: async (episodeId: string) => {
    console.warn('fetchEpisodeContent is deprecated. Use setContent() with props instead.');
    return;
    /*
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

    set.mergeState({
      maxIndex,
      content: processedData,
      categoryTitles,
      itemTitles,
    })

    ContentStore.set('setIdStrings', processedData)
    */
  },

  nextSlide() {
    console.log('Next Slide');
    const maxIndex = get('maxIndex'); // maxIndex is array length - 1
    const activeSlideIndex = get('activeSlideIndex');
    console.log('Next Slide', maxIndex, activeSlideIndex);
    if (maxIndex !== null && activeSlideIndex !== null) {
      const nextIndex = (activeSlideIndex + 1) > maxIndex ? 0 : activeSlideIndex + 1;
      set('activeSlideIndex', nextIndex);
    }
  },

  prevSlide() {
    console.log('Prev Slide');
    const maxIndex = get('maxIndex'); // maxIndex is array length - 1
    const activeSlideIndex = get('activeSlideIndex');
    console.log('Prev Slide', maxIndex, activeSlideIndex);
    if (maxIndex !== null && activeSlideIndex !== null) {
      const prevIndex = (activeSlideIndex - 1) < 0 ? maxIndex : activeSlideIndex - 1;
      set('activeSlideIndex', prevIndex);
    }
  },

  // Legacy method - not used in props-based API approach
  // Fetch data in your page component and pass via props instead
  fetchLatestEpisode: async () => {
    console.warn('fetchLatestEpisode is deprecated. Fetch data in your page component and use setContent() instead.');
    return;
    /*
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
      set.mergeState({ episodeId: latestEpisodeId });
      ContentStore.set('fetchEpisodeContent', latestEpisodeId);
    }
    */
  },
}));







interface TweetStoreState {
  tweets: {[key: string]: any}
}


export const TweetStore = createStore<TweetStoreState>({
  tweets: {},
}, {
  name: 'tweet-store',
  persist: { enabled: true }
}).extendActions(({ set, get })=>({

  getTweet: async (tweet_id: string) => {
    console.log('530society TWEETID', tweet_id)
    const tweets = get('tweets')

    console.log('poop', { tweets, tweet_id })

    if (tweet_id in tweets) {
      return tweets[tweet_id]
    }

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('platform_post_id', tweet_id)
      .single() // Ensure you only get one post

    if (error) {
      console.log('530society test', error)
      // throw new Error(`Error fetching tweet: ${error.message}`)
    }

    if (data) {
      set('tweets', { ...tweets, [tweet_id]: data })
      return data
    }

    return null
  },  

}))



export default ContentStore


