import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
    .select('id, is_admin, is_moderator, display_name, discord_avatar')
    .eq('session_token', token)
    .single();

  return user;
}

async function canManageMembers(userId: string, showId: string, supabase: any, isAdmin: boolean, isModerator: boolean) {
  if (isAdmin || isModerator) return true;

  const { data: member } = await supabase
    .from('show_members')
    .select('can_manage_members')
    .eq('show_id', showId)
    .eq('user_id', userId)
    .single();

  return member?.can_manage_members || false;
}

/**
 * GET /api/shows/[slug]/members
 * List all members of a show
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug } = await params;

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

    const { data: members, error: membersError } = await supabase
      .from('show_members')
      .select(`
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
      `)
      .eq('show_id', show.id)
      .order('display_order')
      .order('created_at');

    if (membersError) {
      console.error('Error fetching members:', membersError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch members' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, data: members },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('GET /api/shows/[slug]/members error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/shows/[slug]/members
 * Add a new member to the show
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug } = await params;

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

    const hasPermission = await canManageMembers(
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

    const body = await request.json();
    const { user_id, discord_id, discord_username, discord_avatar, display_name, role } = body;

    if (!role) {
      return NextResponse.json(
        { success: false, error: 'role is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Must provide either user_id OR discord_id (with Discord data)
    if (!user_id && !discord_id) {
      return NextResponse.json(
        { success: false, error: 'user_id or discord_id is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const validRoles = ['showrunner', 'cohost', 'producer', 'moderator', 'guest'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400, headers: corsHeaders }
      );
    }

    let targetUserId = user_id;

    // If discord_id provided, look up or create user
    if (discord_id && !user_id) {
      // Check if user exists by discord_id
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('discord_id', discord_id)
        .maybeSingle();

      if (existingUser) {
        targetUserId = existingUser.id;
      } else {
        // Create new user from Discord data
        if (!discord_username || !display_name) {
          return NextResponse.json(
            { success: false, error: 'discord_username and display_name required for new Discord users' },
            { status: 400, headers: corsHeaders }
          );
        }

        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            discord_id,
            discord_username,
            discord_avatar,
            display_name,
            is_guild_member: true,
          })
          .select('id')
          .single();

        if (createError || !newUser) {
          console.error('Error creating user from Discord:', createError);
          return NextResponse.json(
            { success: false, error: 'Failed to create user' },
            { status: 500, headers: corsHeaders }
          );
        }

        targetUserId = newUser.id;
        console.log(`[Members] Created new user for Discord member ${discord_username} (${discord_id})`);
      }
    } else if (user_id) {
      // Verify user_id exists
      const { data: targetUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', user_id)
        .single();

      if (!targetUser) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404, headers: corsHeaders }
        );
      }
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('show_members')
      .select('id')
      .eq('show_id', show.id)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json(
        { success: false, error: 'User is already a member of this show' },
        { status: 409, headers: corsHeaders }
      );
    }

    const { data: newMember, error: insertError } = await supabase
      .from('show_members')
      .insert({
        show_id: show.id,
        user_id: targetUserId,
        role,
        added_by: user.id,
      })
      .select(`
        id,
        user_id,
        role,
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
      `)
      .single();

    if (insertError) {
      console.error('Error adding member:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to add member' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, data: newMember },
      { status: 201, headers: corsHeaders }
    );
  } catch (err) {
    console.error('POST /api/shows/[slug]/members error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/shows/[slug]/members
 * Remove a member from the show (pass member_id in query string)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug } = await params;
    const memberId = request.nextUrl.searchParams.get('member_id');

    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'member_id is required' },
        { status: 400, headers: corsHeaders }
      );
    }

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

    const hasPermission = await canManageMembers(
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

    const { error: deleteError } = await supabase
      .from('show_members')
      .delete()
      .eq('id', memberId)
      .eq('show_id', show.id);

    if (deleteError) {
      console.error('Error removing member:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to remove member' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Member removed successfully' },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('DELETE /api/shows/[slug]/members error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
