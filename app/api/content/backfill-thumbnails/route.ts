import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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
    // Card thumbnail locations vary by card type
    const card = tweetData.card;
    if (card.binding_values) {
      const bv = card.binding_values;
      if (bv.thumbnail_image_large?.image_value?.url) return bv.thumbnail_image_large.image_value.url;
      if (bv.thumbnail_image?.image_value?.url) return bv.thumbnail_image.image_value.url;
      if (bv.player_image_large?.image_value?.url) return bv.player_image_large.image_value.url;
      if (bv.player_image?.image_value?.url) return bv.player_image.image_value.url;
      if (bv.summary_photo_image_large?.image_value?.url) return bv.summary_photo_image_large.image_value.url;
      if (bv.summary_photo_image?.image_value?.url) return bv.summary_photo_image.image_value.url;
    }
  }

  // Try entities.media (older format)
  if (tweetData.entities?.media && Array.isArray(tweetData.entities.media) && tweetData.entities.media.length > 0) {
    const media = tweetData.entities.media[0];
    return media.media_url_https || media.media_url;
  }

  // Try extended_entities.media
  if (tweetData.extended_entities?.media && Array.isArray(tweetData.extended_entities.media)) {
    const media = tweetData.extended_entities.media[0];
    return media.media_url_https || media.media_url;
  }

  return null;
}

/**
 * Fetch tweet data from Twitter syndication API
 */
async function fetchTweetFromTwitter(tweetId: string): Promise<any | null> {
  try {
    const url = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en&token=0`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; 530Society/1.0)' },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * POST /api/content/backfill-thumbnails
 * Backfill missing thumbnails from stored tweet data
 * Also fetches missing tweet data from Twitter API
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get content with missing thumbnails that have tweet data
    // Check for both NULL and empty string
    const { data: contentMissingThumbnails, error: contentError } = await supabase
      .from('content')
      .select('id, platform_content_id')
      .eq('platform', 'twitter')
      .not('platform_content_id', 'is', null)
      .or('thumbnail_url.is.null,thumbnail_url.eq.')
      .limit(500);

    if (contentError) {
      console.error('Error fetching content:', contentError);
      return NextResponse.json({ success: false, error: 'Failed to fetch content' }, { status: 500 });
    }

    if (!contentMissingThumbnails || contentMissingThumbnails.length === 0) {
      return NextResponse.json({ success: true, message: 'No content needs thumbnail backfill', updated: 0 });
    }

    const tweetIds = contentMissingThumbnails.map(c => c.platform_content_id).filter(Boolean);

    if (tweetIds.length === 0) {
      return NextResponse.json({ success: true, message: 'No valid tweet IDs found', updated: 0 });
    }

    // Get tweet data in batches of 50 to avoid query limits
    const batchSize = 50;
    let allTweets: any[] = [];
    const foundTweetIds = new Set<string>();

    for (let i = 0; i < tweetIds.length; i += batchSize) {
      const batchIds = tweetIds.slice(i, i + batchSize);
      const { data: batchTweets, error: tweetsError } = await supabase
        .from('tweets')
        .select('id, data')
        .in('id', batchIds);

      if (tweetsError) {
        console.error('Error fetching tweets batch:', tweetsError);
        continue;
      }

      if (batchTweets) {
        allTweets = allTweets.concat(batchTweets);
        batchTweets.forEach(t => foundTweetIds.add(t.id));
      }
    }

    // Find tweet IDs that don't have stored data and fetch from Twitter API
    const missingTweetIds = tweetIds.filter(id => !foundTweetIds.has(id));
    let fetched = 0;

    // Fetch up to 20 missing tweets from Twitter API (rate limit consideration)
    for (const tweetId of missingTweetIds.slice(0, 20)) {
      const tweetData = await fetchTweetFromTwitter(tweetId);
      if (tweetData) {
        // Store in tweets table
        await supabase.from('tweets').upsert({
          id: tweetId,
          data: tweetData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

        allTweets.push({ id: tweetId, data: tweetData });
        fetched++;
      }
    }

    let updated = 0;
    let errors = 0;

    for (const tweet of allTweets) {
      try {
        // Parse tweet data (might be string or object)
        let tweetData = tweet.data;
        if (typeof tweetData === 'string') {
          tweetData = JSON.parse(tweetData);
        }

        const thumbnailUrl = extractThumbnailFromTweetData(tweetData);
        if (thumbnailUrl) {
          const { error: updateError } = await supabase
            .from('content')
            .update({ thumbnail_url: thumbnailUrl })
            .eq('platform_content_id', tweet.id)
            .or('thumbnail_url.is.null,thumbnail_url.eq.');

          if (updateError) {
            console.error(`Failed to update content for tweet ${tweet.id}:`, updateError);
            errors++;
          } else {
            console.log(`Updated thumbnail for tweet ${tweet.id}`);
            updated++;
          }
        }
      } catch (parseError) {
        console.error(`Failed to parse tweet data for ${tweet.id}:`, parseError);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Backfilled ${updated} thumbnails, fetched ${fetched} from Twitter`,
      updated,
      fetched,
      errors,
      checked: contentMissingThumbnails.length,
      missingTweets: missingTweetIds.length,
    });
  } catch (err) {
    console.error('Backfill thumbnails error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
