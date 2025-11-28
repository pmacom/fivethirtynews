import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * GET /api/settings - Get all system settings (public read)
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('key');

    if (error) {
      console.error('Error fetching settings:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch settings' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ success: true, data }, { headers: corsHeaders });
  } catch (err) {
    console.error('GET settings error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/settings - Update a system setting (admin only)
 * Body: { key: string, value: any }
 */
export async function POST(request: NextRequest) {
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

    const { key, value } = await request.json();

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Setting key is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data, error } = await supabase
      .from('system_settings')
      .upsert({
        key,
        value,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating setting:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update setting' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ success: true, data }, { headers: corsHeaders });
  } catch (err) {
    console.error('POST settings error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
