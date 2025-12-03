import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
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
    .select('id, is_admin, is_moderator, display_name')
    .eq('session_token', token)
    .single();

  return user;
}

async function canManageEpisodes(userId: string, showId: string, supabase: any, isAdmin: boolean, isModerator: boolean) {
  if (isAdmin || isModerator) return true;

  const { data: member } = await supabase
    .from('show_members')
    .select('can_create_episodes, can_manage_show, role')
    .eq('show_id', showId)
    .eq('user_id', userId)
    .single();

  return member?.can_create_episodes || member?.can_manage_show || member?.role === 'showrunner';
}

/**
 * GET /api/shows/[slug]/episodes/[id]
 * Get a single episode
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug, id } = await params;

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

    const { data: episode, error } = await supabase
      .from('episodes')
      .select('*')
      .eq('id', id)
      .eq('show_id', show.id)
      .single();

    if (error || !episode) {
      return NextResponse.json(
        { success: false, error: 'Episode not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, data: episode },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('GET /api/shows/[slug]/episodes/[id] error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PUT /api/shows/[slug]/episodes/[id]
 * Update an episode
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug, id } = await params;

    const user = await getAuthenticatedUser(request, supabase);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('id, name')
      .eq('slug', slug)
      .single();

    if (showError || !show) {
      return NextResponse.json(
        { success: false, error: 'Show not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const hasPermission = await canManageEpisodes(
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

    // Verify episode exists and belongs to this show
    const { data: existingEpisode, error: episodeError } = await supabase
      .from('episodes')
      .select('id')
      .eq('id', id)
      .eq('show_id', show.id)
      .single();

    if (episodeError || !existingEpisode) {
      return NextResponse.json(
        { success: false, error: 'Episode not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      date,
      scheduled_at,
      episode_number,
      status,
      content_starts_at,
    } = body;

    // Build update object with only provided fields
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (date !== undefined) updateData.date = date;
    if (scheduled_at !== undefined) updateData.scheduled_at = scheduled_at;
    if (episode_number !== undefined) updateData.episode_number = episode_number;
    if (status !== undefined) updateData.status = status;
    if (content_starts_at !== undefined) updateData.content_starts_at = content_starts_at;

    const { data: updatedEpisode, error: updateError } = await supabase
      .from('episodes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating episode:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update episode' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, data: updatedEpisode },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('PUT /api/shows/[slug]/episodes/[id] error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/shows/[slug]/episodes/[id]
 * Delete an episode
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug, id } = await params;

    const user = await getAuthenticatedUser(request, supabase);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

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

    const hasPermission = await canManageEpisodes(
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

    // Verify episode exists and belongs to this show
    const { data: existingEpisode, error: episodeError } = await supabase
      .from('episodes')
      .select('id')
      .eq('id', id)
      .eq('show_id', show.id)
      .single();

    if (episodeError || !existingEpisode) {
      return NextResponse.json(
        { success: false, error: 'Episode not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const { error: deleteError } = await supabase
      .from('episodes')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting episode:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete episode' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Episode deleted' },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('DELETE /api/shows/[slug]/episodes/[id] error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
