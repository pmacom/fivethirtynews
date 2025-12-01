import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    .select('id, is_admin, is_moderator, display_name')
    .eq('session_token', token)
    .single();

  return user;
}

async function canCreateEpisodes(userId: string, showId: string, supabase: any, isAdmin: boolean, isModerator: boolean) {
  if (isAdmin || isModerator) return true;

  const { data: member } = await supabase
    .from('show_members')
    .select('can_create_episodes')
    .eq('show_id', showId)
    .eq('user_id', userId)
    .single();

  return member?.can_create_episodes || false;
}

/**
 * GET /api/shows/[slug]/episodes
 * List episodes for a show
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug } = await params;
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

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

    let query = supabase
      .from('episodes')
      .select('*')
      .eq('show_id', show.id)
      .order('scheduled_at', { ascending: false, nullsFirst: false })
      .order('date', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: episodes, error } = await query;

    if (error) {
      console.error('Error fetching episodes:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch episodes' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, data: episodes },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('GET /api/shows/[slug]/episodes error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/shows/[slug]/episodes
 * Create a new episode for a show
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
      .select('id, name')
      .eq('slug', slug)
      .single();

    if (showError || !show) {
      return NextResponse.json(
        { success: false, error: 'Show not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const hasPermission = await canCreateEpisodes(
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
    const {
      title,
      description,
      date,
      scheduled_at,
      episode_number,
      status = 'scheduled',
    } = body;

    // Validate required fields
    if (!date && !scheduled_at) {
      return NextResponse.json(
        { success: false, error: 'Either date or scheduled_at is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get next episode number if not provided
    let nextEpisodeNumber = episode_number;
    if (!nextEpisodeNumber) {
      const { data: lastEpisode } = await supabase
        .from('episodes')
        .select('episode_number')
        .eq('show_id', show.id)
        .not('episode_number', 'is', null)
        .order('episode_number', { ascending: false })
        .limit(1)
        .single();

      nextEpisodeNumber = (lastEpisode?.episode_number || 0) + 1;
    }

    const { data: newEpisode, error: createError } = await supabase
      .from('episodes')
      .insert({
        show_id: show.id,
        title: title || `${show.name} #${nextEpisodeNumber}`,
        description: description || null,
        date: date || scheduled_at?.split('T')[0],
        scheduled_at: scheduled_at || null,
        episode_number: nextEpisodeNumber,
        status,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating episode:', createError);
      return NextResponse.json(
        { success: false, error: 'Failed to create episode' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, data: newEpisode },
      { status: 201, headers: corsHeaders }
    );
  } catch (err) {
    console.error('POST /api/shows/[slug]/episodes error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
