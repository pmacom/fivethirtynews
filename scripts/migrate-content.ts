#!/usr/bin/env npx tsx
/**
 * Content Migration Script
 *
 * Migrates content records from old schema fields to new schema fields:
 * - content_type → platform
 * - content_url → url
 * - content_id → platform_content_id
 * - description → title (extracted)
 * - categories → channels (mapped)
 *
 * Usage:
 *   npx tsx scripts/migrate-content.ts --dry-run     # Preview changes
 *   npx tsx scripts/migrate-content.ts               # Run migration
 *   npx tsx scripts/migrate-content.ts --batch-size=100
 *   npx tsx scripts/migrate-content.ts --content-type=twitter
 *   npx tsx scripts/migrate-content.ts --limit=1000
 */

import { createClient } from '@supabase/supabase-js';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const batchSizeArg = args.find((a) => a.startsWith('--batch-size='));
const contentTypeArg = args.find((a) => a.startsWith('--content-type='));
const limitArg = args.find((a) => a.startsWith('--limit='));

const BATCH_SIZE = batchSizeArg ? parseInt(batchSizeArg.split('=')[1], 10) : 500;
const CONTENT_TYPE_FILTER = contentTypeArg ? contentTypeArg.split('=')[1] : null;
const TOTAL_LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

// Supabase connection (local)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

// Category to Channel mapping
const CATEGORY_TO_CHANNEL: Record<string, string> = {
  // Direct matches (lowercase)
  preshow: 'preshow',
  general: 'main-events',
  video: 'video',
  'threejs-r3f': 'threejs',
  robotics: 'robotics',
  '3dmodels': '3d-models',
  art: 'art',
  splats: 'splats',
  virtual: 'virtual',
  code: 'code',
  security: 'security',
  audio: 'audio',
  design: 'design',
  blender: 'blender',
  shaders: 'shaders',
  ux: 'ux',
  llm: 'llm',
  unreal: 'unreal',
  medicine: 'medicine',
  playcanvas: 'playcanvas',
  workflows: 'workflows',
  unity: 'unity',
  energy: 'energy',
  crypto: 'crypto',
  hyperfy: 'hyperfy',
  'dcl-general': 'dcl-general',
  law: 'law',
  'metaverse-general': 'metaverse-general',
  godot: 'godot',
  oncyber: 'oncyber',
  showcase: 'showcase',

  // Uppercase variations
  AI: 'llm',
  PRESHOW: 'preshow',
  THIRDDIMENSION: '3d-models',
  MISC: 'nonsense',
  GENERAL: 'main-events',
  CODE: 'code',
  METAVERSE: 'metaverse-general',
  Web3: 'crypto',
  Crypto: 'crypto',
  Design: 'design',
  Robotics: 'robotics',
  LLM: 'llm',
  UX: 'ux',
};

// Track unmapped categories
const unmappedCategories = new Set<string>();

/**
 * Detect platform from content_type and URL
 */
function detectPlatform(contentType: string, url: string): string {
  // Direct mappings
  if (contentType === 'twitter') return 'twitter';
  if (contentType === 'warpcast') return 'farcaster';

  // URL-based detection for video/website
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('reddit.com')) return 'reddit';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('discord.com') || url.includes('discord.gg')) return 'discord';
  if (url.includes('vimeo.com')) return 'vimeo';
  if (url.includes('warpcast.com')) return 'farcaster';

  // Default for unknown websites
  return 'website';
}

/**
 * Extract platform-specific content ID from URL
 */
function extractPlatformContentId(platform: string, url: string, existingId: string): string {
  switch (platform) {
    case 'twitter': {
      const tweetMatch = url.match(/\/status\/(\d+)/);
      return tweetMatch?.[1] || existingId;
    }
    case 'youtube': {
      const ytMatch = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      return ytMatch?.[1] || existingId;
    }
    case 'reddit': {
      const redditMatch = url.match(/\/comments\/([a-z0-9]+)/i);
      return redditMatch?.[1] || existingId;
    }
    default:
      return existingId || url;
  }
}

/**
 * Extract Twitter author username from URL
 */
function extractTwitterAuthor(url: string): { username: string | null; authorUrl: string | null } {
  const match = url.match(/twitter\.com\/([^\/]+)\/status/);
  if (match) {
    const username = match[1];
    return {
      username,
      authorUrl: `https://twitter.com/${username}`,
    };
  }
  return { username: null, authorUrl: null };
}

/**
 * Extract title from description (first line, max 100 chars)
 */
function extractTitle(description: string): string {
  if (!description) return '';

  // Get first line, clean it up
  const firstLine = description.split('\n')[0].trim();

  // Remove quotes if wrapped
  const cleaned = firstLine.replace(/^["']|["']$/g, '');

  // Truncate to 100 chars
  return cleaned.length > 100 ? cleaned.substring(0, 97) + '...' : cleaned;
}

/**
 * Map old categories array to new channels array
 */
function mapCategoriesToChannels(categories: string[]): string[] {
  if (!categories?.length) return [];

  const channels = new Set<string>();
  for (const cat of categories) {
    const mapped = CATEGORY_TO_CHANNEL[cat] || CATEGORY_TO_CHANNEL[cat.toLowerCase()];
    if (mapped) {
      channels.add(mapped);
    } else {
      unmappedCategories.add(cat);
    }
  }
  return Array.from(channels);
}

interface ContentRecord {
  id: string;
  content_type: string;
  content_url: string;
  content_id: string | null;
  description: string | null;
  categories: string[] | null;
  category: string | null;
}

interface MigrationResult {
  id: string;
  platform: string;
  url: string;
  platform_content_id: string;
  title: string;
  author_username: string | null;
  author_url: string | null;
  channels: string[];
  primary_channel: string | null;
}

/**
 * Transform a single record
 */
function transformRecord(record: ContentRecord): MigrationResult | null {
  const { id, content_type, content_url, content_id, description, categories, category } = record;

  // Skip if no URL
  if (!content_url) {
    return null;
  }

  // Detect platform
  const platform = detectPlatform(content_type, content_url);

  // Extract platform content ID
  const platform_content_id = extractPlatformContentId(platform, content_url, content_id || '');

  // Extract title
  const title = extractTitle(description || '');

  // Extract author (Twitter only)
  const { username: author_username, authorUrl: author_url } =
    platform === 'twitter' ? extractTwitterAuthor(content_url) : { username: null, authorUrl: null };

  // Map categories to channels
  // Combine both single category and categories array
  const allCategories = [...(categories || [])];
  if (category && !allCategories.includes(category)) {
    allCategories.push(category);
  }
  const channels = mapCategoriesToChannels(allCategories);
  const primary_channel = channels[0] || null;

  return {
    id,
    platform,
    url: content_url,
    platform_content_id,
    title,
    author_username,
    author_url,
    channels,
    primary_channel,
  };
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('\n========================================');
  console.log('  Content Migration Script');
  console.log('========================================\n');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE MIGRATION'}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  if (CONTENT_TYPE_FILTER) console.log(`Content type filter: ${CONTENT_TYPE_FILTER}`);
  if (TOTAL_LIMIT) console.log(`Total limit: ${TOTAL_LIMIT}`);
  console.log('');

  let totalProcessed = 0;
  let totalSucceeded = 0;
  let totalSkipped = 0;
  let batchNumber = 0;
  let hasMore = true;

  while (hasMore) {
    batchNumber++;

    // Build query
    let query = supabase
      .from('content')
      .select('id, content_type, content_url, content_id, description, categories, category')
      .is('platform', null)
      .not('content_url', 'is', null)
      .neq('content_url', '')
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (CONTENT_TYPE_FILTER) {
      query = query.eq('content_type', CONTENT_TYPE_FILTER);
    }

    const { data: records, error } = await query;

    if (error) {
      console.error('Error fetching records:', error);
      process.exit(1);
    }

    if (!records || records.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`\nBatch ${batchNumber}: Processing ${records.length} records...`);

    let batchSucceeded = 0;
    let batchSkipped = 0;

    for (const record of records) {
      const transformed = transformRecord(record as ContentRecord);

      if (!transformed) {
        batchSkipped++;
        continue;
      }

      if (isDryRun) {
        // In dry-run mode, just show a sample of transformations
        if (batchSucceeded < 3) {
          console.log(`  [DRY RUN] Would update ${transformed.id}:`);
          console.log(`    platform: ${transformed.platform}`);
          console.log(`    title: ${transformed.title.substring(0, 50)}...`);
          console.log(`    channels: [${transformed.channels.join(', ')}]`);
          if (transformed.author_username) {
            console.log(`    author: @${transformed.author_username}`);
          }
        }
        batchSucceeded++;
      } else {
        // Actually update the record
        const { error: updateError } = await supabase
          .from('content')
          .update({
            platform: transformed.platform,
            url: transformed.url,
            platform_content_id: transformed.platform_content_id,
            title: transformed.title,
            author_username: transformed.author_username,
            author_url: transformed.author_url,
            channels: transformed.channels,
            primary_channel: transformed.primary_channel,
          })
          .eq('id', transformed.id);

        if (updateError) {
          console.error(`  Error updating ${transformed.id}:`, updateError.message);
          batchSkipped++;
        } else {
          batchSucceeded++;
        }
      }

      totalProcessed++;

      // Check total limit
      if (TOTAL_LIMIT && totalProcessed >= TOTAL_LIMIT) {
        hasMore = false;
        break;
      }
    }

    totalSucceeded += batchSucceeded;
    totalSkipped += batchSkipped;

    console.log(`  Batch ${batchNumber} complete: ${batchSucceeded} succeeded, ${batchSkipped} skipped`);

    // If we got fewer than batch size, we're done
    if (records.length < BATCH_SIZE) {
      hasMore = false;
    }
  }

  // Summary
  console.log('\n========================================');
  console.log('  Migration Summary');
  console.log('========================================\n');
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Succeeded: ${totalSucceeded}`);
  console.log(`Skipped: ${totalSkipped}`);
  console.log(`Batches: ${batchNumber}`);

  if (unmappedCategories.size > 0) {
    console.log(`\nUnmapped categories (${unmappedCategories.size}):`);
    for (const cat of unmappedCategories) {
      console.log(`  - ${cat}`);
    }
  }

  if (isDryRun) {
    console.log('\n[DRY RUN] No changes were made. Run without --dry-run to apply changes.');
  } else {
    console.log('\nMigration complete!');
  }
}

// Run migration
migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
