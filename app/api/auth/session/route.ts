import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

// Session endpoint - get current user from cookie
// GET /api/auth/session

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('530_session')?.value;

  if (!sessionToken) {
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }

  try {
    const supabase = await createClient();

    // Find user by session token
    const { data: user, error } = await supabase
      .from('users')
      .select('id, discord_id, discord_username, discord_avatar, display_name, is_guild_member, is_moderator, session_expires_at')
      .eq('session_token', sessionToken)
      .single();

    if (error || !user) {
      // Invalid session - clear cookies
      const response = NextResponse.json({
        authenticated: false,
        user: null,
        error: 'Invalid session',
      });
      response.cookies.delete('530_session');
      response.cookies.delete('530_user');
      return response;
    }

    // Check if session is expired
    if (user.session_expires_at && new Date(user.session_expires_at) < new Date()) {
      const response = NextResponse.json({
        authenticated: false,
        user: null,
        error: 'Session expired',
      });
      response.cookies.delete('530_session');
      response.cookies.delete('530_user');
      return response;
    }

    // Check guild membership
    if (!user.is_guild_member) {
      const response = NextResponse.json({
        authenticated: false,
        user: null,
        error: 'Not a guild member',
      });
      response.cookies.delete('530_session');
      response.cookies.delete('530_user');
      return response;
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        discord_id: user.discord_id,
        display_name: user.display_name,
        avatar: user.discord_avatar,
        is_moderator: user.is_moderator,
      },
    });
  } catch (err) {
    console.error('Session check error:', err);
    return NextResponse.json({
      authenticated: false,
      user: null,
      error: 'Session check failed',
    }, { status: 500 });
  }
}
