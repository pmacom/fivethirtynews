import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// User stats API
// GET /api/user/stats - Get current user's tag and note counts

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Helper to verify session and get user
async function verifySession(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Missing authorization' };
  }

  const sessionToken = authHeader.replace('Bearer ', '');

  if (!sessionToken.startsWith('530_')) {
    return { user: null, error: 'Invalid token format' };
  }

  const supabase = await createClient();

  const { data: user, error } = await supabase
    .from('users')
    .select('id, display_name, discord_avatar, session_expires_at, is_guild_member')
    .eq('session_token', sessionToken)
    .single();

  if (error || !user) {
    return { user: null, error: 'Invalid session' };
  }

  if (user.session_expires_at && new Date(user.session_expires_at) < new Date()) {
    return { user: null, error: 'Session expired' };
  }

  return { user, error: null };
}

export async function GET(request: NextRequest) {
  // Auth required
  const { user, error: authError } = await verifySession(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: authError },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const supabase = await createClient();

    // Get notes count for this user
    const { count: notesCount, error: notesError } = await supabase
      .from('content_notes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (notesError) {
      console.error('Error counting notes:', notesError);
    }

    // For now, tags count = 0 since we don't track per-user tags yet
    // This could be enhanced later to count content items the user has tagged
    const tagsCount = 0;

    return NextResponse.json(
      {
        success: true,
        data: {
          tags: tagsCount,
          notes: notesCount || 0,
        },
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('GET user stats error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
