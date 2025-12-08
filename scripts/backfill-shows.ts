/**
 * Backfill Shows Script: Create historical episodes from content dates
 *
 * This script queries content by original posting time (content_created_at) in weekly
 * spans and creates backdated episodes for the wormhole show.
 *
 * Usage:
 *   npx tsx scripts/backfill-shows.ts [--dry-run] [--execute] [options]
 *
 * Options:
 *   --dry-run      (default) Show what would be created without making changes
 *   --execute      Actually create the episodes and content blocks
 *   --limit N      Only process N weeks (for testing)
 *   --verbose      Show detailed content breakdown per week
 *   --start-year Y Start from year Y instead of earliest content (e.g., --start-year 2025)
 *   --min-content N Only create episodes for weeks with at least N content items (default: 1)
 *
 * The script:
 * 1. Finds the wormhole show and its category templates
 * 2. Skips weeks that already have episodes
 * 3. Goes forward week by week from earliest content (or --start-year) to existing episodes
 * 4. Queries content by content_created_at for each week window
 * 5. Shows stats for each week and overall summary
 * 6. With --execute, creates episodes with content blocks based on show templates
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');
const verbose = args.includes('--verbose');
const limitIndex = args.indexOf('--limit');
const weekLimit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : null;
const startYearIndex = args.indexOf('--start-year');
const startYear = startYearIndex !== -1 ? parseInt(args[startYearIndex + 1], 10) : null;
const minContentIndex = args.indexOf('--min-content');
const minContent = minContentIndex !== -1 ? parseInt(args[minContentIndex + 1], 10) : 1;

// Show schedule: Wednesday at 5:30 PM ET
const SHOW_DAY_OF_WEEK = 3; // Wednesday (0 = Sunday)
const SHOW_HOUR = 17;
const SHOW_MINUTE = 30;
const SHOW_TIMEZONE = 'America/New_York';

interface CategoryTemplate {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  tags: string[];
}

interface WeekStats {
  weekStart: Date;
  weekEnd: Date;
  showDate: Date;
  contentCount: number;
  contentByTag: Record<string, number>;
  contentByPlatform: Record<string, number>;
  allTags: string[];
  hasExistingEpisode: boolean;
  episodeToCreate?: {
    title: string;
    date: Date;
    scheduledAt: Date;
    episodeNumber: number;
  };
}

/**
 * Get the Wednesday at 5:30 PM ET for a given date
 * Goes back to the most recent Wednesday if the date isn't a Wednesday
 */
function getWednesdayOfWeek(date: Date): Date {
  const result = new Date(date);
  const dayOfWeek = result.getUTCDay();
  const daysToSubtract = (dayOfWeek + 7 - SHOW_DAY_OF_WEEK) % 7;
  result.setUTCDate(result.getUTCDate() - daysToSubtract);

  // Set to 5:30 PM ET (22:30 UTC in winter, 21:30 UTC in summer)
  // For simplicity, we'll use 22:30 UTC which is 5:30 PM EST
  result.setUTCHours(22, 30, 0, 0);

  return result;
}

/**
 * Get the content window for a show date
 * Content window is 7 days before the show until the show time
 */
function getContentWindow(showDate: Date): { start: Date; end: Date } {
  const end = new Date(showDate);
  const start = new Date(showDate);
  start.setUTCDate(start.getUTCDate() - 7);
  return { start, end };
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format date for display with time
 */
function formatDateTime(date: Date): string {
  return date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
}

/**
 * Fetch the wormhole show and its category templates
 */
async function fetchShowAndTemplates(): Promise<{
  show: any;
  templates: CategoryTemplate[];
}> {
  const { data: show, error: showError } = await supabase
    .from('shows')
    .select('*')
    .eq('slug', 'wormhole')
    .single();

  if (showError || !show) {
    throw new Error(`Failed to fetch wormhole show: ${showError?.message}`);
  }

  const { data: templatesRaw, error: tempError } = await supabase
    .from('show_category_templates')
    .select(`
      id,
      name,
      slug,
      display_order,
      show_category_template_tags (tag_slug)
    `)
    .eq('show_id', show.id)
    .eq('is_active', true)
    .order('display_order');

  if (tempError) {
    throw new Error(`Failed to fetch templates: ${tempError.message}`);
  }

  const templates: CategoryTemplate[] = (templatesRaw || []).map((t: any) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    display_order: t.display_order,
    tags: t.show_category_template_tags.map((tag: any) => tag.tag_slug),
  }));

  return { show, templates };
}

/**
 * Fetch existing episodes for the show
 */
async function fetchExistingEpisodes(showId: string): Promise<Map<string, any>> {
  const { data: episodes, error } = await supabase
    .from('episodes')
    .select('id, title, date, scheduled_at, episode_number')
    .eq('show_id', showId)
    .order('scheduled_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch episodes: ${error.message}`);
  }

  // Map by date string (YYYY-MM-DD) for easy lookup
  const episodeMap = new Map<string, any>();
  for (const ep of episodes || []) {
    const dateStr = formatDate(new Date(ep.date || ep.scheduled_at));
    episodeMap.set(dateStr, ep);
  }

  return episodeMap;
}

/**
 * Query content for a given time window
 * Returns ALL content in the window, regardless of tags
 */
async function queryContentForWindow(
  start: Date,
  end: Date,
  _templates: CategoryTemplate[] // Kept for interface compatibility
): Promise<{
  count: number;
  byTag: Record<string, number>;
  byPlatform: Record<string, number>;
  allTags: string[];
}> {
  // Query ALL content within the time window (no tag filtering)
  const { data: content, error } = await supabase
    .from('content')
    .select('id, tags, platform, channels, primary_channel')
    .gte('content_created_at', start.toISOString())
    .lt('content_created_at', end.toISOString());
  // Note: Not filtering by approval_status to show all available content

  if (error) {
    console.error('Error querying content:', error);
    return { count: 0, byTag: {}, byPlatform: {}, allTags: [] };
  }

  const byTag: Record<string, number> = {};
  const byPlatform: Record<string, number> = {};
  const tagSet = new Set<string>();

  for (const item of content || []) {
    // Count by platform
    const platform = item.platform || 'unknown';
    byPlatform[platform] = (byPlatform[platform] || 0) + 1;

    // Count ALL tags (not filtered by templates)
    const itemTags: string[] = item.tags || [];
    for (const tag of itemTags) {
      byTag[tag] = (byTag[tag] || 0) + 1;
      tagSet.add(tag);
    }

    // Also check channels
    const channels: string[] = item.channels || [];
    for (const channel of channels) {
      byTag[channel] = (byTag[channel] || 0) + 1;
      tagSet.add(channel);
    }
    if (item.primary_channel) {
      byTag[item.primary_channel] = (byTag[item.primary_channel] || 0) + 1;
      tagSet.add(item.primary_channel);
    }
  }

  return {
    count: content?.length || 0,
    byTag,
    byPlatform,
    allTags: [...tagSet].sort()
  };
}

/**
 * Create an episode with content blocks
 */
async function createEpisode(
  showId: string,
  showDate: Date,
  episodeNumber: number,
  templates: CategoryTemplate[],
  createdBy: string
): Promise<string> {
  const title = `wormhole #${episodeNumber}`;
  const contentWindow = getContentWindow(showDate);

  // Create the episode
  const { data: episode, error: epError } = await supabase
    .from('episodes')
    .insert({
      show_id: showId,
      title,
      date: showDate.toISOString().split('T')[0],
      scheduled_at: showDate.toISOString(),
      content_starts_at: contentWindow.start.toISOString(),
      episode_number: episodeNumber,
      status: 'completed', // Historical episodes are already "completed"
      created_by: createdBy,
    })
    .select('id')
    .single();

  if (epError || !episode) {
    throw new Error(`Failed to create episode: ${epError?.message}`);
  }

  // Create content blocks for each template
  for (const template of templates) {
    const { error: blockError } = await supabase
      .from('content_blocks')
      .insert({
        episode_id: episode.id,
        title: template.name,
        template_id: template.id,
        tags: template.tags,
        weight: template.display_order,
      });

    if (blockError) {
      console.error(`Failed to create content block ${template.name}:`, blockError);
    }
  }

  return episode.id;
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(70));
  console.log('Show Backfill Script - Wormhole');
  console.log('='.repeat(70));
  console.log(`Mode: ${dryRun ? 'DRY RUN (use --execute to create episodes)' : '🔴 LIVE - Creating episodes!'}`);
  if (weekLimit) console.log(`Week limit: ${weekLimit}`);
  if (startYear) console.log(`Start year: ${startYear}`);
  console.log(`Min content per episode: ${minContent}`);
  if (verbose) console.log('Verbose mode: ON');
  console.log('');

  // Fetch show and templates
  console.log('Fetching show configuration...');
  const { show, templates } = await fetchShowAndTemplates();
  console.log(`Show: ${show.name} (${show.slug})`);
  console.log(`Schedule: ${show.schedule_text}`);
  console.log(`Templates: ${templates.length} category templates`);
  if (verbose) {
    for (const t of templates) {
      console.log(`  - ${t.name}: ${t.tags.join(', ')}`);
    }
  }
  console.log('');

  // Fetch existing episodes
  console.log('Fetching existing episodes...');
  const existingEpisodes = await fetchExistingEpisodes(show.id);
  console.log(`Found ${existingEpisodes.size} existing episodes`);

  // Find the highest existing episode number
  let maxEpisodeNumber = 0;
  for (const ep of existingEpisodes.values()) {
    if (ep.episode_number > maxEpisodeNumber) {
      maxEpisodeNumber = ep.episode_number;
    }
  }

  // Get the earliest existing episode date
  let earliestExistingDate: Date | null = null;
  for (const ep of existingEpisodes.values()) {
    const epDate = new Date(ep.date || ep.scheduled_at);
    if (!earliestExistingDate || epDate < earliestExistingDate) {
      earliestExistingDate = epDate;
    }
  }
  if (earliestExistingDate) {
    console.log(`Earliest existing episode: ${formatDate(earliestExistingDate)}`);
  }
  console.log('');

  // Find the date range of content to determine where to start
  console.log('Finding content date range...');
  const { data: earliestContent } = await supabase
    .from('content')
    .select('content_created_at')
    .not('content_created_at', 'is', null)
    .order('content_created_at', { ascending: true })
    .limit(1);

  const { data: latestContent } = await supabase
    .from('content')
    .select('content_created_at')
    .not('content_created_at', 'is', null)
    .order('content_created_at', { ascending: false })
    .limit(1);

  if (!earliestContent?.[0] || !latestContent?.[0]) {
    console.log('No content with dates found!');
    return;
  }

  const earliestContentDate = new Date(earliestContent[0].content_created_at);
  const latestContentDate = new Date(latestContent[0].content_created_at);
  console.log(`Content range: ${formatDate(earliestContentDate)} to ${formatDate(latestContentDate)}`);

  // Determine start date based on earliest content or --start-year
  let effectiveStartDate: Date;
  if (startYear) {
    effectiveStartDate = new Date(`${startYear}-01-01T00:00:00Z`);
    console.log(`Using --start-year: ${startYear}`);
  } else {
    effectiveStartDate = earliestContentDate;
  }

  // Start from the Wednesday of the effective start date
  let currentShowDate = getWednesdayOfWeek(effectiveStartDate);
  // Move to the next Wednesday if start date is after the Wednesday
  if (effectiveStartDate > currentShowDate) {
    currentShowDate.setUTCDate(currentShowDate.getUTCDate() + 7);
  }
  console.log(`Starting from first possible show date: ${formatDate(currentShowDate)}`);

  // Set the end date - stop before existing episodes or at latest content
  let endDate: Date;
  if (earliestExistingDate) {
    endDate = getWednesdayOfWeek(earliestExistingDate);
    console.log(`Will stop before existing episode at: ${formatDate(endDate)}`);
  } else {
    endDate = getWednesdayOfWeek(latestContentDate);
    endDate.setUTCDate(endDate.getUTCDate() + 7); // Include the last week
    console.log(`Will stop after latest content at: ${formatDate(endDate)}`);
  }
  console.log('');

  // Process weeks going FORWARD from earliest content to existing episodes
  const weekStats: WeekStats[] = [];
  let weeksProcessed = 0;

  console.log('Scanning content by week (going forward in time)...');
  console.log('-'.repeat(70));

  while (currentShowDate < endDate) {
    if (weekLimit && weeksProcessed >= weekLimit) {
      console.log(`\nReached week limit of ${weekLimit}`);
      break;
    }

    const contentWindow = getContentWindow(currentShowDate);
    const dateStr = formatDate(currentShowDate);
    const hasExisting = existingEpisodes.has(dateStr);

    // Skip if this week already has an episode
    if (hasExisting) {
      console.log(`✓ ${formatDate(currentShowDate)} | [EXISTING EPISODE - SKIPPING]`);
      currentShowDate.setUTCDate(currentShowDate.getUTCDate() + 7);
      weeksProcessed++;
      continue;
    }

    // Query content for this window
    const { count, byTag, byPlatform, allTags } = await queryContentForWindow(
      contentWindow.start,
      contentWindow.end,
      templates
    );

    const stats: WeekStats = {
      weekStart: contentWindow.start,
      weekEnd: contentWindow.end,
      showDate: new Date(currentShowDate),
      contentCount: count,
      contentByTag: byTag,
      contentByPlatform: byPlatform,
      allTags,
      hasExistingEpisode: hasExisting,
    };

    // Print week summary
    const statusIcon = count > 0 ? '○' : '·';
    console.log(
      `${statusIcon} ${formatDate(currentShowDate)} | Content: ${count.toString().padStart(4)} | ` +
      `Window: ${formatDate(contentWindow.start)} to ${formatDate(contentWindow.end)}`
    );

    if (verbose && count > 0) {
      const platformStr = Object.entries(byPlatform)
        .map(([p, c]) => `${p}: ${c}`)
        .join(', ');
      console.log(`    Platforms: ${platformStr}`);

      const topTags = Object.entries(byTag)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([t, c]) => `${t}: ${c}`)
        .join(', ');
      if (topTags) {
        console.log(`    Top tags: ${topTags}`);
      }
      console.log(`    Unique tags: ${allTags.length}`);
    }

    weekStats.push(stats);
    weeksProcessed++;

    // Move to next week
    currentShowDate.setUTCDate(currentShowDate.getUTCDate() + 7);
  }

  console.log('-'.repeat(70));
  console.log('');

  // Calculate summary stats
  const weeksWithAnyContent = weekStats.filter(w => w.contentCount > 0 && !w.hasExistingEpisode);
  const weeksWithEnoughContent = weekStats.filter(w => w.contentCount >= minContent && !w.hasExistingEpisode);
  const totalContent = weekStats.reduce((sum, w) => sum + w.contentCount, 0);
  const avgContentPerWeek = weeksWithAnyContent.length > 0
    ? Math.round(totalContent / weeksWithAnyContent.length)
    : 0;

  console.log('='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total weeks scanned: ${weekStats.length}`);
  console.log(`Weeks with existing episodes: ${weekStats.filter(w => w.hasExistingEpisode).length}`);
  console.log(`Weeks with any content: ${weeksWithAnyContent.length}`);
  console.log(`Weeks with >= ${minContent} content items: ${weeksWithEnoughContent.length}`);
  console.log(`Total content items: ${totalContent}`);
  console.log(`Average content per week: ${avgContentPerWeek}`);
  console.log('');

  if (weeksWithEnoughContent.length === 0) {
    console.log('No weeks found that need episodes. Done!');
    return;
  }

  // Weeks are already in chronological order (oldest first)
  const weeksToCreate = weeksWithEnoughContent;

  console.log('Episodes to create (will be numbered 1 to N, existing episodes renumbered):');
  console.log('-'.repeat(70));

  for (let i = 0; i < weeksToCreate.length; i++) {
    const week = weeksToCreate[i];
    const episodeNum = i + 1;
    console.log(
      `  Episode #${episodeNum} | ${formatDate(week.showDate)} | ${week.contentCount} content items`
    );
  }
  console.log('');

  if (dryRun) {
    console.log('='.repeat(70));
    console.log('DRY RUN COMPLETE');
    console.log('='.repeat(70));
    console.log(`Would create ${weeksToCreate.length} episodes`);
    console.log('');
    console.log('To create these episodes, run:');
    console.log('  npx tsx scripts/backfill-shows.ts --execute');
    console.log('');
    return;
  }

  // Execute mode - create episodes
  console.log('='.repeat(70));
  console.log('CREATING EPISODES');
  console.log('='.repeat(70));

  // Keep existing episodes as-is, number new episodes starting from max + 1
  const totalEpisodes = weeksToCreate.length + existingEpisodes.size;
  console.log(`Total episodes after backfill: ${totalEpisodes}`);
  console.log(`Keeping ${existingEpisodes.size} existing episodes unchanged`);
  console.log('');

  // Create new historical episodes with numbers starting from maxEpisodeNumber + 1
  console.log('Creating historical episodes...');
  let created = 0;
  let nextEpisodeNumber = maxEpisodeNumber + 1;

  for (let i = 0; i < weeksToCreate.length; i++) {
    const week = weeksToCreate[i];
    const episodeNumber = nextEpisodeNumber + i;

    try {
      const episodeId = await createEpisode(
        show.id,
        week.showDate,
        episodeNumber,
        templates,
        show.created_by
      );
      console.log(`  Created: wormhole #${episodeNumber} (${formatDate(week.showDate)}) - ID: ${episodeId}`);
      created++;
    } catch (err) {
      console.error(`  Failed to create episode for ${formatDate(week.showDate)}:`, err);
    }
  }

  console.log('');
  console.log('='.repeat(70));
  console.log('EXECUTION COMPLETE');
  console.log('='.repeat(70));
  console.log(`Episodes created: ${created}`);
  console.log(`Existing episodes kept unchanged: ${existingEpisodes.size}`);
}

main().catch(console.error);
