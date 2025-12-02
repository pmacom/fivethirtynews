"use client"

import React, { useEffect, useState } from 'react';
import WTF from '../WTF';
import { LiveViewContentBlock } from '../Content/types';
import { supabase } from '@/utils/supabase/client';

/**
 * Example 1: Basic Usage - Fetch data and pass as props
 *
 * This replaces the old pattern where WTF fetched its own data.
 * Now the parent component controls data fetching.
 */
export const BasicUsageExample = () => {
  const [content, setContent] = useState<LiveViewContentBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      // Fetch the latest episode
      const { data: episodes, error: episodeError } = await supabase
        .from('episodes')
        .select('*')
        .order('date', { ascending: false })
        .limit(1);

      if (episodeError || !episodes || episodes.length === 0) {
        console.error('Error fetching episodes:', episodeError);
        setLoading(false);
        return;
      }

      const episodeId = episodes[0].id;

      // Fetch content for that episode
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
        console.error('Error fetching content:', error);
        setLoading(false);
        return;
      }

      // Sort content_block_items by weight
      const sortedData: LiveViewContentBlock[] = data.map((block: any) => ({
        ...block,
        content_block_items: block.content_block_items
          .filter((item: any) => item !== undefined)
          .sort((a: any, b: any) => a.weight - b.weight),
      }));

      setContent(sortedData);
      setLoading(false);
    };

    fetchContent();
  }, []);

  if (loading) {
    return <div>Loading content...</div>;
  }

  if (!content || content.length === 0) {
    return <div>No content available</div>;
  }

  return <WTF content={content} />;
};

/**
 * Example 2: With Callbacks - Track user interactions
 */
export const WithCallbacksExample = () => {
  const [content, setContent] = useState<LiveViewContentBlock[]>([]);

  // ... same fetch logic as above ...

  const handleCategoryChange = (categoryId: string, categoryIndex: number) => {
    console.log('Category changed:', { categoryId, categoryIndex });
    // Track analytics, update URL, etc.
  };

  const handleItemChange = (itemId: string, itemIndex: number, itemData: any) => {
    console.log('Item changed:', { itemId, itemIndex, itemData });
    // Update URL, track analytics, preload next item, etc.
  };

  return (
    <WTF
      content={content}
      onCategoryChange={handleCategoryChange}
      onItemChange={handleItemChange}
    />
  );
};

/**
 * Example 3: With Plugins - Enable audio and dev controls
 */
export const WithPluginsExample = () => {
  const [content, setContent] = useState<LiveViewContentBlock[]>([]);

  return (
    <WTF
      content={content}
      enableAudio={true}
      enableDevControls={process.env.NODE_ENV === 'development'}
    />
  );
};

/**
 * Example 4: Custom Initial State - Start at specific category/item
 */
export const CustomInitialStateExample = () => {
  const [content, setContent] = useState<LiveViewContentBlock[]>([]);

  // Extract IDs from URL params or other source
  const urlParams = new URLSearchParams(window.location.search);
  const categoryId = urlParams.get('category');
  const itemId = urlParams.get('item');

  return (
    <WTF
      content={content}
      initialCategoryId={categoryId || undefined}
      initialItemId={itemId || undefined}
    />
  );
};

/**
 * Example 5: Minimal Viewer - No UI, just 3D content
 */
export const MinimalViewerExample = () => {
  const [content, setContent] = useState<LiveViewContentBlock[]>([]);

  return (
    <WTF
      content={content}
      showLegend={false}
      showDetails={false}
      enableKeyboard={false}
      enableSwipe={false}
    />
  );
};

/**
 * Example 6: With Custom 3D Models
 */
export const WithCustomModelsExample = () => {
  const [content, setContent] = useState<LiveViewContentBlock[]>([]);

  return (
    <WTF content={content}>
      {/* Add your custom 3D models here */}
      <mesh position={[0, 5, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="hotpink" />
      </mesh>
    </WTF>
  );
};

export default BasicUsageExample;
