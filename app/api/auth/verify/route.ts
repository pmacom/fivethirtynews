import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Session verification endpoint
// GET /api/auth/verify
// Headers: Authorization: Bearer <session_token>

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, valid: false, error: 'Missing or invalid Authorization header' },
      { status: 401, headers: corsHeaders }
    );
  }

  const sessionToken = authHeader.replace('Bearer ', '');

  if (!sessionToken || !sessionToken.startsWith('530_')) {
    return NextResponse.json(
      { success: false, valid: false, error: 'Invalid session token format' },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const supabase = await createClient();

    // Find user by session token
    const { data: user, error } = await supabase
      .from('users')
      .select('id, discord_id, discord_username, discord_avatar, display_name, is_guild_member, session_expires_at')
      .eq('session_token', sessionToken)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { success: false, valid: false, error: 'Invalid or expired session' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Check if session is expired
    if (user.session_expires_at && new Date(user.session_expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, valid: false, error: 'Session expired' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Check guild membership status
    if (!user.is_guild_member) {
      return NextResponse.json(
        { success: false, valid: false, error: 'User is no longer a guild member' },
        { status: 403, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        valid: true,
        user: {
          id: user.id,
          discord_id: user.discord_id,
          display_name: user.display_name,
          avatar: user.discord_avatar,
        },
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('Session verification error:', err);
    return NextResponse.json(
      { success: false, valid: false, error: 'Verification failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}
