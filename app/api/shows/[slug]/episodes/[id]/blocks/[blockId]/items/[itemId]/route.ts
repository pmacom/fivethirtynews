import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
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
 * DELETE /api/shows/[slug]/episodes/[id]/blocks/[blockId]/items/[itemId]
 * Remove a content item from a block
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string; blockId: string; itemId: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug, blockId, itemId } = await params;

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

    // Verify item exists and belongs to the block
    const { data: item } = await supabase
      .from('content_block_items')
      .select('id, content_block_id')
      .eq('id', itemId)
      .eq('content_block_id', blockId)
      .single();

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Delete item
    const { error: deleteError } = await supabase
      .from('content_block_items')
      .delete()
      .eq('id', itemId);

    if (deleteError) {
      console.error('Error deleting item:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete item' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Item removed' },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('DELETE item error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
