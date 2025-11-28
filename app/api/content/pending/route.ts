import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * GET /api/content/pending - Get all pending content (moderators/admins only)
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('530_session')?.value;

  // Also check Authorization header for extension/API clients
  const authHeader = request.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
  const token = sessionToken || bearerToken;

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const supabase = await createClient();

    // Verify user is admin or moderator
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, is_admin, is_moderator')
      .eq('session_token', token)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401, headers: corsHeaders }
      );
    }

    if (!user.is_admin && !user.is_moderator) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - moderator or admin role required' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Get pending content with submitter info
    const { data: pendingContent, error } = await supabase
      .from('content')
      .select('*, submitter:submitted_by_user_id(id, display_name, discord_avatar)')
      .eq('approval_status', 'pending')
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending content:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch pending content' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      data: pendingContent || [],
      count: pendingContent?.length || 0
    }, { headers: corsHeaders });

  } catch (err) {
    console.error('GET pending content error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
