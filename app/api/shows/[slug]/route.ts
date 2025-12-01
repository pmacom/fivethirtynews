import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * OPTIONS /api/shows/[slug]
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Helper to get authenticated user
 */
async function getAuthenticatedUser(request: NextRequest, supabase: any) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('530_session')?.value;
  const authHeader = request.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
  const token = sessionToken || bearerToken;

  if (!token) return null;

  const { data: user } = await supabase
    .from('users')
    .select('id, is_admin, is_moderator, display_name, discord_avatar')
    .eq('session_token', token)
    .single();

  return user;
}

/**
 * Helper to check if user can manage a show
 */
async function canManageShow(userId: string, showId: string, supabase: any, isAdmin: boolean, isModerator: boolean) {
  // Site admins and mods have full access
  if (isAdmin || isModerator) return true;

  // Check show membership
  const { data: member } = await supabase
    .from('show_members')
    .select('can_manage_show')
    .eq('show_id', showId)
    .eq('user_id', userId)
    .single();

  return member?.can_manage_show || false;
}

/**
 * GET /api/shows/[slug]
 * Get a single show with members and recent episodes
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug } = await params;

    // Get the show with members
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select(`
        *,
        show_members (
          id,
          user_id,
          role,
          display_order,
          can_manage_members,
          can_manage_show,
          can_create_episodes,
          created_at,
          users:users!show_members_user_id_fkey (
            id,
            display_name,
            discord_avatar,
            discord_username
          )
        )
      `)
      .eq('slug', slug)
      .single();

    if (showError) {
      if (showError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Show not found' },
          { status: 404, headers: corsHeaders }
        );
      }
      console.error('Error fetching show:', showError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch show' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Get recent episodes for this show
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('*')
      .eq('show_id', show.id)
      .order('scheduled_at', { ascending: false, nullsFirst: false })
      .order('date', { ascending: false })
      .limit(20);

    if (episodesError) {
      console.error('Error fetching episodes:', episodesError);
    }

    // Get schedule exceptions
    const { data: exceptions } = await supabase
      .from('show_schedule_exceptions')
      .select('*')
      .eq('show_id', show.id)
      .gte('original_date', new Date().toISOString().split('T')[0])
      .order('original_date');

    // Check if current user has permissions
    const user = await getAuthenticatedUser(request, supabase);
    let userPermissions = null;

    if (user) {
      const { data: membership } = await supabase
        .from('show_members')
        .select('role, can_manage_members, can_manage_show, can_create_episodes')
        .eq('show_id', show.id)
        .eq('user_id', user.id)
        .single();

      userPermissions = {
        isSiteAdmin: user.is_admin || false,
        isSiteModerator: user.is_moderator || false,
        membership: membership || null,
        canManageShow: user.is_admin || user.is_moderator || membership?.can_manage_show || false,
        canManageMembers: user.is_admin || user.is_moderator || membership?.can_manage_members || false,
        canCreateEpisodes: user.is_admin || user.is_moderator || membership?.can_create_episodes || false,
      };
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...show,
          episodes: episodes || [],
          schedule_exceptions: exceptions || [],
          userPermissions,
        },
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('GET /api/shows/[slug] error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PUT /api/shows/[slug]
 * Update a show (requires manage permissions)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug } = await params;

    // Get authenticated user
    const user = await getAuthenticatedUser(request, supabase);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get the show
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
    const hasPermission = await canManageShow(
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

    // Parse and validate update data
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    // Only include fields that are provided
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.image_url !== undefined) updateData.image_url = body.image_url;
    if (body.schedule_frequency !== undefined) updateData.schedule_frequency = body.schedule_frequency;
    if (body.schedule_day_of_week !== undefined) updateData.schedule_day_of_week = body.schedule_day_of_week;
    if (body.schedule_week_of_month !== undefined) updateData.schedule_week_of_month = body.schedule_week_of_month;
    if (body.schedule_time !== undefined) updateData.schedule_time = body.schedule_time;
    if (body.schedule_timezone !== undefined) updateData.schedule_timezone = body.schedule_timezone;
    if (body.schedule_text !== undefined) updateData.schedule_text = body.schedule_text;
    if (body.duration_minutes !== undefined) updateData.duration_minutes = body.duration_minutes;
    if (body.status !== undefined) updateData.status = body.status;

    // Note: slug changes are not allowed via PUT to prevent breaking URLs

    const { data: updatedShow, error: updateError } = await supabase
      .from('shows')
      .update(updateData)
      .eq('id', show.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating show:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update show' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, data: updatedShow },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('PUT /api/shows/[slug] error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/shows/[slug]
 * Archive a show (admin only - actually sets status to 'archived')
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug } = await params;

    // Get authenticated user
    const user = await getAuthenticatedUser(request, supabase);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Only site admins can archive shows
    if (!user.is_admin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Archive the show (soft delete)
    const { data: archivedShow, error } = await supabase
      .from('shows')
      .update({ status: 'archived' })
      .eq('slug', slug)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Show not found' },
          { status: 404, headers: corsHeaders }
        );
      }
      console.error('Error archiving show:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to archive show' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, data: archivedShow, message: 'Show archived successfully' },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('DELETE /api/shows/[slug] error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
