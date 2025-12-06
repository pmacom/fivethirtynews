import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

async function getAuthenticatedUser(request: NextRequest, supabase: any) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('530_session')?.value;
  const authHeader = request.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
  const token = sessionToken || bearerToken;

  if (!token) return null;

  const { data: user } = await supabase
    .from('users')
    .select('id, is_admin, is_moderator')
    .eq('session_token', token)
    .single();

  return user;
}

/**
 * POST /api/shows/[slug]/episodes/[id]/approve-all
 * Bulk select AND approve all content items shown in the curate columns
 * This does both:
 *   1. Adds all matching content to content_block_items (selects them)
 *   2. Updates their approval_status to 'approved'
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug, id: episodeId } = await params;

    const user = await getAuthenticatedUser(request, supabase);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    if (!user.is_admin && !user.is_moderator) {
      return NextResponse.json(
        { success: false, error: 'Admin or moderator access required' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Verify show exists
    const { data: show } = await supabase
      .from('shows')
      .select('id, created_at')
      .eq('slug', slug)
      .single();

    if (!show) {
      return NextResponse.json(
        { success: false, error: 'Show not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Verify episode belongs to show and get date fields for content window
    const { data: episode } = await supabase
      .from('episodes')
      .select('id, date, scheduled_at, status, content_starts_at')
      .eq('id', episodeId)
      .eq('show_id', show.id)
      .single();

    if (!episode) {
      return NextResponse.json(
        { success: false, error: 'Episode not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Determine content window (same logic as curate API)
    let sinceDate: string;
    if (episode.content_starts_at) {
      sinceDate = episode.content_starts_at;
    } else {
      const episodeDate = episode.date || episode.scheduled_at?.split('T')[0];
      if (episodeDate) {
        const defaultStart = new Date(episodeDate);
        defaultStart.setDate(defaultStart.getDate() - 7);
        sinceDate = defaultStart.toISOString();
      } else {
        sinceDate = show.created_at;
      }
    }

    let untilDate: string | null;
    if (episode.status === 'completed' || episode.status === 'live') {
      untilDate = episode.scheduled_at || (episode.date ? `${episode.date}T23:59:59Z` : null);
    } else {
      untilDate = new Date().toISOString();
    }

    // Get all content blocks for this episode with their existing selected items
    const { data: blocks } = await supabase
      .from('content_blocks')
      .select(`
        id,
        tags,
        content_block_items (
          news_id
        )
      `)
      .eq('episode_id', episodeId)
      .order('weight');

    if (!blocks || blocks.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          selected_count: 0,
          approved_count: 0,
          message: 'No content blocks found',
        },
      }, { headers: corsHeaders });
    }

    let totalSelected = 0;
    const allContentIds = new Set<string>();

    // For each block, find matching content and add to content_block_items
    for (const block of blocks) {
      const tagSlugs = block.tags || [];
      if (tagSlugs.length === 0) continue;

      // Get already selected content IDs for this block
      const alreadySelected = new Set(
        (block.content_block_items || []).map((item: any) => item.news_id)
      );

      // Build filters for tags, channels, and primary_channel (same as curate API)
      const tagFilters = tagSlugs.map((tag: string) => `tags.cs.["${tag}"]`);
      const channelFilters = tagSlugs.map((s: string) => `channels.cs.["${s}"]`);
      const primaryChannelFilters = tagSlugs.map((s: string) => `primary_channel.eq.${s}`);
      const allFilters = [...tagFilters, ...channelFilters, ...primaryChannelFilters].join(',');

      // Query content matching tags within date range
      let contentQuery = supabase
        .from('content')
        .select('id')
        .gte('content_created_at', sinceDate)
        .or(allFilters);

      if (untilDate) {
        contentQuery = contentQuery.lte('content_created_at', untilDate);
      }

      const { data: matchingContent } = await contentQuery;

      if (!matchingContent || matchingContent.length === 0) continue;

      // Find content not yet selected
      const toSelect = matchingContent.filter(c => !alreadySelected.has(c.id));

      // Track all content IDs for approval
      for (const c of matchingContent) {
        allContentIds.add(c.id);
      }

      if (toSelect.length === 0) continue;

      // Get current max weight for this block
      const { data: maxWeightResult } = await supabase
        .from('content_block_items')
        .select('weight')
        .eq('content_block_id', block.id)
        .order('weight', { ascending: false })
        .limit(1)
        .single();

      let nextWeight = (maxWeightResult?.weight ?? -1) + 1;

      // Insert new content_block_items
      const itemsToInsert = toSelect.map(c => ({
        content_block_id: block.id,
        news_id: c.id,
        weight: nextWeight++,
      }));

      const { error: insertError } = await supabase
        .from('content_block_items')
        .insert(itemsToInsert);

      if (insertError) {
        console.error(`Error inserting items for block ${block.id}:`, insertError);
      } else {
        totalSelected += toSelect.length;
      }
    }

    // Bulk approve all content
    let approvedCount = 0;
    if (allContentIds.size > 0) {
      const { data: updatedContent, error: updateError } = await supabase
        .from('content')
        .update({ approval_status: 'approved' })
        .in('id', Array.from(allContentIds))
        .neq('approval_status', 'approved')
        .select('id');

      if (updateError) {
        console.error('Error approving content:', updateError);
      } else {
        approvedCount = updatedContent?.length || 0;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        selected_count: totalSelected,
        approved_count: approvedCount,
        total_items: allContentIds.size,
        message: totalSelected > 0 || approvedCount > 0
          ? `Selected ${totalSelected} and approved ${approvedCount} content items`
          : 'All items were already selected and approved',
      },
    }, { headers: corsHeaders });

  } catch (err) {
    console.error('POST approve-all error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
