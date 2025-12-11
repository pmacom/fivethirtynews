#!/usr/bin/env npx tsx
/**
 * Backfill thumbnail_url for content that's missing it
 *
 * This script:
 * 1. Finds approved content with missing thumbnail_url
 * 2. For Twitter content, extracts thumbnail from existing tweets table data
 * 3. For content without tweet data, fetches from Twitter syndication API
 * 4. Updates content table with extracted thumbnail_url
 *
 * Usage: npx tsx scripts/backfill-thumbnails.ts [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';

// Use local Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const supabase = createClient(supabaseUrl, supabaseKey);

const isDryRun = process.argv.includes('--dry-run');

/**
 * Extract thumbnail URL from Twitter API response
 * Handles multiple formats: mediaDetails, photos, video, card, entities
 */
function extractThumbnailFromTweetData(tweetData: any): string | null {
  if (!tweetData || typeof tweetData !== 'object') return null;

  // Try mediaDetails first (most common for videos/images)
  if (tweetData.mediaDetails && Array.isArray(tweetData.mediaDetails) && tweetData.mediaDetails.length > 0) {
    const media = tweetData.mediaDetails[0];
    if (media.media_url_https) {
      return media.media_url_https;
    }
  }

  // Try photos array
  if (tweetData.photos && Array.isArray(tweetData.photos) && tweetData.photos.length > 0) {
    const photo = tweetData.photos[0];
    return photo.url || photo.media_url_https;
  }

  // Try video thumbnail
  if (tweetData.video) {
    if (tweetData.video.poster) return tweetData.video.poster;
    if (tweetData.video.thumbnail_url) return tweetData.video.thumbnail_url;
  }

  // Try card (Twitter cards/embeds)
  if (tweetData.card) {
    const card = tweetData.card;
    if (card.binding_values) {
      const bv = card.binding_values;
      if (bv.thumbnail_image_large?.image_value?.url) return bv.thumbnail_image_large.image_value.url;
      if (bv.thumbnail_image?.image_value?.url) return bv.thumbnail_image.image_value.url;
      if (bv.player_image_large?.image_value?.url) return bv.player_image_large.image_value.url;
      if (bv.player_image?.image_value?.url) return bv.player_image.image_value.url;
    }
  }

  // Try entities.media (older format)
  if (tweetData.entities?.media && Array.isArray(tweetData.entities.media) && tweetData.entities.media.length > 0) {
    const media = tweetData.entities.media[0];
    return media.media_url_https || media.media_url;
  }

  // Try extended_entities.media
  if (tweetData.extended_entities?.media && Array.isArray(tweetData.extended_entities.media) && tweetData.extended_entities.media.length > 0) {
    const media = tweetData.extended_entities.media[0];
    return media.media_url_https || media.media_url;
  }

  return null;
}

/**
 * Fetch tweet data from Twitter syndication API
 */
async function fetchTweetFromAPI(tweetId: string): Promise<any | null> {
  try {
    const response = await fetch(
      `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; 530News/1.0)',
        },
      }
    );

    if (!response.ok) {
      console.log(`  API returned ${response.status} for tweet ${tweetId}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`  Error fetching tweet ${tweetId}:`, error);
    return null;
  }
}

async function main() {
  console.log('=== Thumbnail Backfill Script ===');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE (will update database)'}`);
  console.log('');

  // Step 1: Find content missing thumbnails
  console.log('Step 1: Finding content with missing thumbnails...');

  const { data: missingContent, error: fetchError } = await supabase
    .from('content')
    .select('id, platform_content_id, content_type, content_url')
    .is('thumbnail_url', null)
    .eq('approval_status', 'approved')
    .not('platform_content_id', 'is', null);

  if (fetchError) {
    console.error('Error fetching content:', fetchError);
    process.exit(1);
  }

  console.log(`Found ${missingContent?.length || 0} items missing thumbnails`);
  console.log('');

  if (!missingContent || missingContent.length === 0) {
    console.log('Nothing to backfill!');
    return;
  }

  // Group by content type
  const byType: Record<string, typeof missingContent> = {};
  for (const item of missingContent) {
    const type = item.content_type || 'unknown';
    if (!byType[type]) byType[type] = [];
    byType[type].push(item);
  }

  console.log('By content type:');
  for (const [type, items] of Object.entries(byType)) {
    console.log(`  ${type}: ${items.length}`);
  }
  console.log('');

  // Step 2: Get all tweet IDs we need
  const twitterContent = byType['twitter'] || [];
  const tweetIds = twitterContent.map(c => c.platform_content_id).filter(Boolean);

  console.log(`Step 2: Looking up ${tweetIds.length} tweets in database...`);

  // Build lookup map - fetch in batches to avoid URI length limits
  const tweetDataMap = new Map<string, any>();
  const BATCH_SIZE = 50;

  for (let i = 0; i < tweetIds.length; i += BATCH_SIZE) {
    const batch = tweetIds.slice(i, i + BATCH_SIZE);
    const { data: existingTweets, error: tweetsError } = await supabase
      .from('tweets')
      .select('id, data')
      .in('id', batch);

    if (tweetsError) {
      console.error('Error fetching tweets batch:', tweetsError);
      continue;
    }

    for (const tweet of existingTweets || []) {
      const data = typeof tweet.data === 'string' ? JSON.parse(tweet.data) : tweet.data;
      tweetDataMap.set(tweet.id, data);
    }
  }

  console.log(`Found ${tweetDataMap.size} tweets in database`);
  console.log('');

  // Step 3: Extract thumbnails and update
  console.log('Step 3: Extracting thumbnails and updating...');

  let updated = 0;
  let skipped = 0;
  let noThumbnail = 0;
  let apiCalls = 0;

  for (const content of twitterContent) {
    const tweetId = content.platform_content_id;
    let tweetData = tweetDataMap.get(tweetId);

    // If no tweet data in DB, try to fetch from API
    if (!tweetData) {
      console.log(`  ${content.id}: No tweet data, fetching from API...`);
      apiCalls++;
      tweetData = await fetchTweetFromAPI(tweetId);

      if (tweetData) {
        // Store the tweet data for future use
        if (!isDryRun) {
          await supabase.from('tweets').upsert({
            id: tweetId,
            data: tweetData,
            text: tweetData.text,
            screen_name: tweetData.user?.screen_name,
            profile_image: tweetData.user?.profile_image_url_https,
          });
        }
      }

      // Rate limit: 100ms between API calls
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!tweetData) {
      console.log(`  ${content.id}: No tweet data available, skipping`);
      skipped++;
      continue;
    }

    // Extract thumbnail
    const thumbnailUrl = extractThumbnailFromTweetData(tweetData);

    if (!thumbnailUrl) {
      // This is a text-only tweet with no media
      noThumbnail++;
      continue;
    }

    // Update the content record
    if (!isDryRun) {
      const { error: updateError } = await supabase
        .from('content')
        .update({ thumbnail_url: thumbnailUrl })
        .eq('id', content.id);

      if (updateError) {
        console.error(`  Error updating ${content.id}:`, updateError);
        continue;
      }
    }

    updated++;
    if (updated % 100 === 0) {
      console.log(`  Progress: ${updated} updated...`);
    }
  }

  console.log('');
  console.log('=== Summary ===');
  console.log(`Total processed: ${twitterContent.length}`);
  console.log(`Updated with thumbnail: ${updated}`);
  console.log(`No thumbnail (text-only): ${noThumbnail}`);
  console.log(`Skipped (no data): ${skipped}`);
  console.log(`API calls made: ${apiCalls}`);

  if (isDryRun) {
    console.log('');
    console.log('This was a DRY RUN. Run without --dry-run to apply changes.');
  }
}

main().catch(console.error);
