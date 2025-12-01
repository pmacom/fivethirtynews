import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const BOT_URL = process.env.BOT_URL || 'http://localhost:3001';
const BOT_API_SECRET = process.env.BOT_API_SECRET;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || '1031322428288278539';

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/discord/members
 * Fetch Discord server members (showrunners only)
 * Query params:
 *   - countOnly: if 'true', only return the member count
 *   - showId: optional show ID to verify showrunner permission
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const countOnly = searchParams.get('countOnly') === 'true';
    const showId = searchParams.get('showId');

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

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id, is_admin, is_moderator')
      .eq('session_token', token)
      .single();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Check if user has permission (admin, mod, or showrunner of the specified show)
    let hasPermission = user.is_admin || user.is_moderator;

    if (!hasPermission && showId) {
      const { data: membership } = await supabase
        .from('show_members')
        .select('role, can_manage_members')
        .eq('show_id', showId)
        .eq('user_id', user.id)
        .single();

      hasPermission = membership?.role === 'showrunner' || membership?.can_manage_members;
    }

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Permission denied. Must be admin, mod, or showrunner.' },
        { status: 403, headers: corsHeaders }
      );
    }

    if (!BOT_API_SECRET) {
      console.error('BOT_API_SECRET not configured');
      return NextResponse.json(
        { success: false, error: 'Bot not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Call the Discord bot API
    const endpoint = countOnly
      ? `${BOT_URL}/members/${DISCORD_GUILD_ID}/count`
      : `${BOT_URL}/members/${DISCORD_GUILD_ID}`;

    const botResponse = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${BOT_API_SECRET}`,
      },
    });

    if (!botResponse.ok) {
      const error = await botResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Bot API error:', error);
      return NextResponse.json(
        { success: false, error: error.error || 'Failed to fetch members' },
        { status: botResponse.status, headers: corsHeaders }
      );
    }

    const data = await botResponse.json();

    return NextResponse.json(
      { success: true, ...data },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('GET /api/discord/members error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
