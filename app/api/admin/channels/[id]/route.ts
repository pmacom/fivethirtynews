import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * POST /api/admin/channels/[id] - Update channel Discord mapping (admin only)
 * Body: { discord_channel_id: string | null }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('530_session')?.value;
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

    // Verify admin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, is_admin')
      .eq('session_token', token)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401, headers: corsHeaders }
      );
    }

    if (!user.is_admin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403, headers: corsHeaders }
      );
    }

    const { discord_channel_id } = await request.json();

    // Validate Discord channel ID format (should be numeric string, 17-19 digits)
    if (discord_channel_id && !/^\d{17,19}$/.test(discord_channel_id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Discord channel ID format' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data, error } = await supabase
      .from('channels')
      .update({
        discord_channel_id: discord_channel_id || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating channel:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update channel' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ success: true, data }, { headers: corsHeaders });
  } catch (err) {
    console.error('POST admin/channels/[id] error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
