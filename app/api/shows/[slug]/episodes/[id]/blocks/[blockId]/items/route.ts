import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
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
 * POST /api/shows/[slug]/episodes/[id]/blocks/[blockId]/items
 * Add a content item to a block
 */
export async function POST(
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
    const { data: show } = await supabase
      .from('shows')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!show) {
      return NextResponse.json(
        { success: false, error: 'Show not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Verify block exists and belongs to this episode
    const { data: block } = await supabase
      .from('content_blocks')
      .select('id, episode_id')
      .eq('id', blockId)
      .single();

    if (!block) {
      return NextResponse.json(
        { success: false, error: 'Block not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Verify episode belongs to show
    const { data: episode } = await supabase
      .from('episodes')
      .select('id')
      .eq('id', block.episode_id)
      .eq('show_id', show.id)
      .single();

    if (!episode) {
      return NextResponse.json(
        { success: false, error: 'Episode not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { content_id } = body;

    if (!content_id) {
      return NextResponse.json(
        { success: false, error: 'content_id is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get max weight for ordering
    const { data: maxWeightResult } = await supabase
      .from('content_block_items')
      .select('weight')
      .eq('content_block_id', blockId)
      .order('weight', { ascending: false })
      .limit(1)
      .single();

    const nextWeight = (maxWeightResult?.weight ?? -1) + 1;

    // Add item
    const { data: newItem, error: insertError } = await supabase
      .from('content_block_items')
      .insert({
        content_block_id: blockId,
        news_id: content_id,
        weight: nextWeight,
      })
      .select('id, weight, news_id')
      .single();

    if (insertError) {
      console.error('Error adding item:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to add item' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, data: newItem },
      { status: 201, headers: corsHeaders }
    );
  } catch (err) {
    console.error('POST items error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/shows/[slug]/episodes/[id]/blocks/[blockId]/items
 * Remove a content item from a block (deselect it)
 * Body: { news_id: string }
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
    const { data: show } = await supabase
      .from('shows')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!show) {
      return NextResponse.json(
        { success: false, error: 'Show not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Verify block exists
    const { data: block } = await supabase
      .from('content_blocks')
      .select('id, episode_id')
      .eq('id', blockId)
      .single();

    if (!block) {
      return NextResponse.json(
        { success: false, error: 'Block not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Verify episode belongs to show
    const { data: episode } = await supabase
      .from('episodes')
      .select('id')
      .eq('id', block.episode_id)
      .eq('show_id', show.id)
      .single();

    if (!episode) {
      return NextResponse.json(
        { success: false, error: 'Episode not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { news_id } = body;

    if (!news_id) {
      return NextResponse.json(
        { success: false, error: 'news_id is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Delete the item
    const { error: deleteError } = await supabase
      .from('content_block_items')
      .delete()
      .eq('content_block_id', blockId)
      .eq('news_id', news_id);

    if (deleteError) {
      console.error('Error removing item:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to remove item' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Item removed' },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('DELETE items error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
