import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

// CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * OPTIONS /api/shows
 * Handle preflight requests
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/shows
 * List all active shows with their members
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const includeArchived = searchParams.get('includeArchived') === 'true';

    let query = supabase
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
          users:users!show_members_user_id_fkey (
            id,
            display_name,
            discord_avatar
          )
        )
      `)
      .order('name');

    // Filter by status unless includeArchived is true
    if (!includeArchived) {
      query = query.neq('status', 'archived');
    }

    const { data: shows, error } = await query;

    if (error) {
      console.error('Error fetching shows:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch shows' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, data: shows },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('GET /api/shows error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/shows
 * Create a new show (admin/mod only)
 */
export async function POST(request: NextRequest) {
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

    // Get user and check permissions
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

    // Only admins and moderators can create shows
    if (!user.is_admin && !user.is_moderator) {
      return NextResponse.json(
        { success: false, error: 'Admin or moderator access required' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      name,
      slug,
      description,
      image_url,
      schedule_frequency,
      schedule_day_of_week,
      schedule_week_of_month,
      schedule_time,
      schedule_timezone,
      schedule_text,
      duration_minutes,
    } = body;

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json(
        { success: false, error: 'Name and slug are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate slug format (lowercase, alphanumeric, hyphens only)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { success: false, error: 'Slug must be lowercase alphanumeric with hyphens only' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if slug already exists
    const { data: existingShow, error: checkError } = await supabase
      .from('shows')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existingShow && !checkError) {
      return NextResponse.json(
        { success: false, error: 'A show with this slug already exists' },
        { status: 409, headers: corsHeaders }
      );
    }

    // Create the show
    const { data: newShow, error: createError } = await supabase
      .from('shows')
      .insert({
        name,
        slug,
        description: description || null,
        image_url: image_url || null,
        schedule_frequency: schedule_frequency || null,
        schedule_day_of_week: schedule_day_of_week ?? null,
        schedule_week_of_month: schedule_week_of_month ?? null,
        schedule_time: schedule_time || null,
        schedule_timezone: schedule_timezone || 'America/New_York',
        schedule_text: schedule_text || null,
        duration_minutes: duration_minutes || 60,
        status: 'active',
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating show:', createError);
      return NextResponse.json(
        { success: false, error: 'Failed to create show' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Automatically add the creator as a showrunner
    const { error: memberError } = await supabase
      .from('show_members')
      .insert({
        show_id: newShow.id,
        user_id: user.id,
        role: 'showrunner',
        added_by: user.id,
      });

    if (memberError) {
      console.error('Error adding creator as showrunner:', memberError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json(
      { success: true, data: newShow },
      { status: 201, headers: corsHeaders }
    );
  } catch (err) {
    console.error('POST /api/shows error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
