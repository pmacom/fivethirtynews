import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/content/search
 *
 * Reusable content search API with full-text search and filtering
 *
 * Query params:
 *   - q: Full-text search (searches title, description, author_name)
 *   - tags: Comma-separated tag slugs (OR logic)
 *   - channels: Comma-separated channel slugs (OR logic)
 *   - platform: Filter by platform (twitter, youtube, etc.)
 *   - since: Start date for content_created_at (ISO string)
 *   - until: End date for content_created_at (ISO string)
 *   - status: Approval status (default: approved, use 'all' for any)
 *   - limit: Max results (default: 50, max: 100)
 *   - offset: Pagination offset (default: 0)
 *   - sort: Sort field (default: content_created_at)
 *   - order: Sort order (default: desc)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    // Parse query params
    const q = searchParams.get('q')?.trim() || '';
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
    const channels = searchParams.get('channels')?.split(',').filter(Boolean) || [];
    const platform = searchParams.get('platform');
    const since = searchParams.get('since');
    const until = searchParams.get('until');
    const status = searchParams.get('status') || 'approved';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const sort = searchParams.get('sort') || 'content_created_at';
    const order = searchParams.get('order') === 'asc' ? true : false;

    // Build query
    let query = supabase
      .from('content')
      .select(`
        id,
        platform,
        platform_content_id,
        url,
        title,
        description,
        author_name,
        author_username,
        author_avatar_url,
        thumbnail_url,
        media_assets,
        tags,
        channels,
        primary_channel,
        approval_status,
        content_created_at,
        created_at
      `, { count: 'exact' });

    // Approval status filter
    if (status !== 'all') {
      query = query.eq('approval_status', status);
    }

    // Full-text search on title, description, author_name
    if (q) {
      // Use ilike for case-insensitive partial matching
      // Search across multiple fields with OR
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,author_name.ilike.%${q}%`);
    }

    // Tags filter (OR logic - content matches if it has ANY of the tags)
    if (tags.length > 0) {
      const tagFilters = tags.map(tag => `tags.cs.["${tag}"]`).join(',');
      query = query.or(tagFilters);
    }

    // Channels filter (OR logic)
    if (channels.length > 0) {
      const channelFilters = channels.map(ch => `channels.cs.["${ch}"]`).join(',');
      const primaryFilters = channels.map(ch => `primary_channel.eq.${ch}`).join(',');
      query = query.or(`${channelFilters},${primaryFilters}`);
    }

    // Platform filter
    if (platform) {
      query = query.eq('platform', platform);
    }

    // Date range filter (using content_created_at - original posting time)
    if (since) {
      query = query.gte('content_created_at', since);
    }
    if (until) {
      query = query.lte('content_created_at', until);
    }

    // Sorting
    const validSortFields = ['content_created_at', 'created_at', 'title'];
    const sortField = validSortFields.includes(sort) ? sort : 'content_created_at';
    query = query.order(sortField, { ascending: order, nullsFirst: false });

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[Content Search] Query error:', error);
      return NextResponse.json(
        { success: false, error: 'Search failed', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    const total = count || 0;
    const hasMore = offset + limit < total;

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        offset,
        limit,
        total,
        hasMore,
      },
      query: {
        q,
        tags,
        channels,
        platform,
        since,
        until,
        status,
        sort: sortField,
        order: order ? 'asc' : 'desc',
      },
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('[Content Search] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
