import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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

async function canCreateEpisodes(userId: string, showId: string, supabase: any, isAdmin: boolean, isModerator: boolean) {
  if (isAdmin || isModerator) return true;

  const { data: member } = await supabase
    .from('show_members')
    .select('can_create_episodes')
    .eq('show_id', showId)
    .eq('user_id', userId)
    .single();

  return member?.can_create_episodes || false;
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/shows/[slug]/episodes/[id]/blocks
 * Get all content blocks for an episode with their items
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug, id: episodeId } = await params;

    // Verify show exists
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('id')
      .eq('slug', slug)
      .single();

    if (showError || !show) {
      return NextResponse.json(
        { success: false, error: 'Show not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Verify episode exists
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('id')
      .eq('id', episodeId)
      .eq('show_id', show.id)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json(
        { success: false, error: 'Episode not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Fetch content blocks with items
    const { data: blocks, error: blocksError } = await supabase
      .from('content_blocks')
      .select(`
        id,
        title,
        description,
        weight,
        template_id,
        content_block_items (
          id,
          weight,
          news_id,
          content:content!content_block_items_news_id_fkey (
            id,
            platform,
            url,
            title,
            description,
            author_name,
            author_avatar_url,
            thumbnail_url,
            media_assets,
            tags,
            created_at
          )
        )
      `)
      .eq('episode_id', episodeId)
      .order('weight');

    if (blocksError) {
      console.error('Error fetching blocks:', blocksError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch content blocks' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Sort items within each block by weight
    const sortedBlocks = (blocks || []).map(block => ({
      ...block,
      content_block_items: (block.content_block_items || [])
        .sort((a: any, b: any) => a.weight - b.weight)
    }));

    return NextResponse.json(
      { success: true, data: sortedBlocks },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('GET /api/shows/[slug]/episodes/[id]/blocks error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/shows/[slug]/episodes/[id]/blocks
 * Create a new content block (Kanban column)
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

    // Verify show exists
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('id')
      .eq('slug', slug)
      .single();

    if (showError || !show) {
      return NextResponse.json(
        { success: false, error: 'Show not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Check permissions
    const hasPermission = await canCreateEpisodes(
      user.id,
      show.id,
      supabase,
      user.is_admin,
      user.is_moderator
    );

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Verify episode exists
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('id')
      .eq('id', episodeId)
      .eq('show_id', show.id)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json(
        { success: false, error: 'Episode not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { title, description, template_id, tags, weight } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Calculate weight if not provided
    let blockWeight = weight;
    if (blockWeight === undefined) {
      const { data: maxBlock } = await supabase
        .from('content_blocks')
        .select('weight')
        .eq('episode_id', episodeId)
        .order('weight', { ascending: false })
        .limit(1)
        .single();

      blockWeight = (maxBlock?.weight ?? -1) + 1;
    }

    // Create the block
    const { data: newBlock, error: createError } = await supabase
      .from('content_blocks')
      .insert({
        episode_id: episodeId,
        title,
        description: description || null,
        template_id: template_id || null,
        tags: tags || [],
        weight: blockWeight,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating block:', createError);
      return NextResponse.json(
        { success: false, error: 'Failed to create block' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, data: newBlock },
      { status: 201, headers: corsHeaders }
    );
  } catch (err) {
    console.error('POST /api/shows/[slug]/episodes/[id]/blocks error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
