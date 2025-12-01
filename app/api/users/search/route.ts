import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
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
 * GET /api/users/search?q=query
 * Search users by display name or discord username
 * Requires authentication
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('530_session')?.value;
    const authHeader = request.headers.get('Authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
    const token = sessionToken || bearerToken;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify token is valid
    const { data: currentUser } = await supabase
      .from('users')
      .select('id')
      .eq('session_token', token)
      .single();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401, headers: corsHeaders }
      );
    }

    const query = request.nextUrl.searchParams.get('q')?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json(
        { success: true, data: [] },
        { headers: corsHeaders }
      );
    }

    // Search users by display_name or discord_username
    // Get all matching users with their admin/mod status for sorting
    const { data: users, error } = await supabase
      .from('users')
      .select('id, display_name, discord_avatar, discord_username, is_admin, is_moderator')
      .or(`display_name.ilike.%${query}%,discord_username.ilike.%${query}%`)
      .limit(50);

    if (error) {
      console.error('Error searching users:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to search users' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Sort by: admins first, then mods, then regular users
    // Within each tier, sort alphabetically by display_name
    const sortedUsers = (users || []).sort((a, b) => {
      // Admins at top (weight 0)
      // Mods next (weight 1)
      // Regular users last (weight 2)
      const weightA = a.is_admin ? 0 : a.is_moderator ? 1 : 2;
      const weightB = b.is_admin ? 0 : b.is_moderator ? 1 : 2;

      if (weightA !== weightB) {
        return weightA - weightB;
      }

      // Same tier - sort alphabetically
      return (a.display_name || '').localeCompare(b.display_name || '');
    });

    // Return top 15 results, strip admin/mod flags for privacy
    const result = sortedUsers.slice(0, 15).map(u => ({
      id: u.id,
      display_name: u.display_name,
      discord_avatar: u.discord_avatar,
      discord_username: u.discord_username,
      is_admin: u.is_admin,
      is_moderator: u.is_moderator,
    }));

    return NextResponse.json(
      { success: true, data: result },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('GET /api/users/search error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
