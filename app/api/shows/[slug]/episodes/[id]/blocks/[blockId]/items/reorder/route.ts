import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
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
 * PATCH /api/shows/[slug]/episodes/[id]/blocks/[blockId]/items/reorder
 * Reorder items within a block
 * Body: { items: [{ id: string, weight: number }] }
 */
export async function PATCH(
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

    // Verify block exists and belongs to this episode
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

    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: 'items array is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Batch update weights
    const updates = items.map(async (item: { id: string; weight: number }) => {
      return supabase
        .from('content_block_items')
        .update({ weight: item.weight })
        .eq('id', item.id)
        .eq('content_block_id', blockId);
    });

    const results = await Promise.all(updates);
    const errors = results.filter(r => r.error);

    if (errors.length > 0) {
      console.error('Error reordering items:', errors);
      return NextResponse.json(
        { success: false, error: 'Failed to reorder some items' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Items reordered' },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('PATCH /api/shows/[slug]/episodes/[id]/blocks/[blockId]/items/reorder error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
