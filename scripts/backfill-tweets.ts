/**
 * Backfill Script: Fetch missing tweet data for content records
 *
 * Usage:
 *   npx tsx scripts/backfill-tweets.ts [--dry-run] [--limit 100] [--batch 10]
 *
 * Options:
 *   --dry-run   Show what would be fetched without actually fetching
 *   --limit     Maximum number of tweets to process (default: all)
 *   --batch     Batch size for API calls (default: 10)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('');
  console.error('For local Supabase, add to .env.local:');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=<your-secret-key>');
  console.error('');
  console.error('Find your secret key by running: supabase status');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitIndex = args.indexOf('--limit');
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : null;
const batchIndex = args.indexOf('--batch');
const batchSize = batchIndex !== -1 ? parseInt(args[batchIndex + 1], 10) : 10;

/**
 * Fetch tweet data from Twitter's syndication API
 */
async function fetchTweetFromSyndication(tweetId: string): Promise<any | null> {
  try {
    const url = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en&token=0`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; 530Society/1.0)',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`  Tweet ${tweetId}: Not found (deleted or private)`);
      } else {
        console.log(`  Tweet ${tweetId}: HTTP ${response.status}`);
      }
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`  Tweet ${tweetId}: Fetch error -`, error);
    return null;
  }
}

/**
 * Sleep helper for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('='.repeat(60));
  console.log('Tweet Backfill Script');
  console.log('='.repeat(60));
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Batch size: ${batchSize}`);
  if (limit) console.log(`Limit: ${limit}`);
  console.log('');

  // Find all Twitter content records
  console.log('Finding Twitter content records...');

  // Fetch all Twitter content with pagination (Supabase has 1000 row default limit)
  const allContentRecords: any[] = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: pageRecords, error: pageError } = await supabase
      .from('content')
      .select('id, platform_content_id, content_id, url, title')
      .eq('platform', 'twitter')
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (pageError) {
      console.error('Error fetching content:', pageError);
      process.exit(1);
    }

    if (pageRecords && pageRecords.length > 0) {
      allContentRecords.push(...pageRecords);
      page++;
      if (pageRecords.length < pageSize) hasMore = false;
    } else {
      hasMore = false;
    }
  }

  let contentRecords = allContentRecords;
  if (limit) {
    contentRecords = contentRecords.slice(0, limit);
  }

  if (!contentRecords || contentRecords.length === 0) {
    console.log('No Twitter content found.');
    return;
  }

  console.log(`Found ${contentRecords.length} Twitter content records`);

  // Get tweet IDs (use platform_content_id, fallback to content_id)
  const tweetIds = contentRecords
    .map(c => c.platform_content_id || c.content_id)
    .filter((id): id is string => id != null);

  console.log(`Extracted ${tweetIds.length} tweet IDs`);

  // Check which tweets already exist in tweets table (in chunks to avoid URI too long)
  console.log('Checking existing tweets in database...');

  const existingIds = new Set<string>();
  const checkChunkSize = 100;

  for (let i = 0; i < tweetIds.length; i += checkChunkSize) {
    const chunk = tweetIds.slice(i, i + checkChunkSize);
    const { data: existingTweets, error: existingError } = await supabase
      .from('tweets')
      .select('id')
      .in('id', chunk);

    if (existingError) {
      console.error('Error checking existing tweets:', existingError);
      process.exit(1);
    }

    existingTweets?.forEach(t => existingIds.add(t.id));
  }
  const missingIds = tweetIds.filter(id => !existingIds.has(id));

  console.log(`Existing in database: ${existingIds.size}`);
  console.log(`Missing (need to fetch): ${missingIds.length}`);
  console.log('');

  if (missingIds.length === 0) {
    console.log('All tweets already in database!');
    return;
  }

  if (dryRun) {
    console.log('DRY RUN - Would fetch these tweet IDs:');
    missingIds.slice(0, 20).forEach(id => console.log(`  - ${id}`));
    if (missingIds.length > 20) {
      console.log(`  ... and ${missingIds.length - 20} more`);
    }
    return;
  }

  // Fetch missing tweets in batches
  console.log(`Fetching ${missingIds.length} tweets in batches of ${batchSize}...`);
  console.log('');

  let successCount = 0;
  let failCount = 0;
  let rateLimitHits = 0;

  for (let i = 0; i < missingIds.length; i += batchSize) {
    const batch = missingIds.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(missingIds.length / batchSize);

    console.log(`Batch ${batchNum}/${totalBatches} (${batch.length} tweets)...`);

    const tweetsToInsert: { id: string; data: any }[] = [];

    for (const tweetId of batch) {
      // Rate limiting: 200ms between requests
      await sleep(200);

      const tweetData = await fetchTweetFromSyndication(tweetId);

      if (tweetData) {
        tweetsToInsert.push({ id: tweetId, data: tweetData });
        successCount++;
        console.log(`  Tweet ${tweetId}: OK`);
      } else {
        failCount++;
      }
    }

    // Insert batch into database
    if (tweetsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('tweets')
        .upsert(
          tweetsToInsert.map(t => ({
            id: t.id,
            data: t.data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })),
          { onConflict: 'id' }
        );

      if (insertError) {
        console.error(`  Database insert error:`, insertError);
      } else {
        console.log(`  Inserted ${tweetsToInsert.length} tweets into database`);
      }
    }

    // Longer pause between batches
    if (i + batchSize < missingIds.length) {
      console.log('  Pausing 2s before next batch...');
      await sleep(2000);
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('Backfill Complete!');
  console.log('='.repeat(60));
  console.log(`Successfully fetched: ${successCount}`);
  console.log(`Failed to fetch: ${failCount}`);
  console.log(`Rate limit hits: ${rateLimitHits}`);
}

main().catch(console.error);
