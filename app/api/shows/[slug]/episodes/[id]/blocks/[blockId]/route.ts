import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
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
 * GET /api/shows/[slug]/episodes/[id]/blocks/[blockId]
 * Get a single content block with its items
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string; blockId: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug, id: episodeId, blockId } = await params;

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

    // Fetch the block
    const { data: block, error: blockError } = await supabase
      .from('content_blocks')
      .select(`
        id,
        title,
        description,
        weight,
        template_id,
        tags,
        content_block_items (
          id,
          weight,
          news_id,
          note
        )
      `)
      .eq('id', blockId)
      .eq('episode_id', episodeId)
      .single();

    if (blockError || !block) {
      return NextResponse.json(
        { success: false, error: 'Block not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, data: block },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('GET /api/shows/[slug]/episodes/[id]/blocks/[blockId] error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PUT /api/shows/[slug]/episodes/[id]/blocks/[blockId]
 * Update a content block (title, description, tags)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string; blockId: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug, id: episodeId, blockId } = await params;

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

    // Verify episode and block exist
    const { data: block, error: blockError } = await supabase
      .from('content_blocks')
      .select('id, episode_id')
      .eq('id', blockId)
      .single();

    if (blockError || !block) {
      return NextResponse.json(
        { success: false, error: 'Block not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Verify block belongs to this episode
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('id')
      .eq('id', episodeId)
      .eq('show_id', show.id)
      .single();

    if (episodeError || !episode || block.episode_id !== episode.id) {
      return NextResponse.json(
        { success: false, error: 'Block does not belong to this episode' },
        { status: 400, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { title, description, tags } = body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = tags;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: updatedBlock, error: updateError } = await supabase
      .from('content_blocks')
      .update(updateData)
      .eq('id', blockId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating block:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update block' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, data: updatedBlock },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('PUT /api/shows/[slug]/episodes/[id]/blocks/[blockId] error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/shows/[slug]/episodes/[id]/blocks/[blockId]
 * Delete a content block and all its items
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string; blockId: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug, id: episodeId, blockId } = await params;

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

    // Verify block belongs to this episode
    const { data: block, error: blockError } = await supabase
      .from('content_blocks')
      .select('id, episode_id')
      .eq('id', blockId)
      .single();

    if (blockError || !block) {
      return NextResponse.json(
        { success: false, error: 'Block not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('id')
      .eq('id', episodeId)
      .eq('show_id', show.id)
      .single();

    if (episodeError || !episode || block.episode_id !== episode.id) {
      return NextResponse.json(
        { success: false, error: 'Block does not belong to this episode' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Delete the block (items will be cascade deleted due to FK constraint)
    const { error: deleteError } = await supabase
      .from('content_blocks')
      .delete()
      .eq('id', blockId);

    if (deleteError) {
      console.error('Error deleting block:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete block' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Block deleted' },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('DELETE /api/shows/[slug]/episodes/[id]/blocks/[blockId] error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
