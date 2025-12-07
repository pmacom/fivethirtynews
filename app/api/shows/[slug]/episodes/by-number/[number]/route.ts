import { NextRequest, NextResponse } from 'next/server';
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
 * GET /api/shows/[slug]/episodes/by-number/[number]
 * Get episode by episode_number instead of UUID
 * Returns the episode data including its UUID for content loading
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; number: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug, number } = await params;
    const episodeNumber = parseInt(number, 10);

    if (isNaN(episodeNumber) || episodeNumber < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid episode number' },
        { status: 400, headers: corsHeaders }
      );
    }

    // First get the show
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('id, name, slug')
      .eq('slug', slug)
      .single();

    if (showError || !show) {
      return NextResponse.json(
        { success: false, error: 'Show not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Get episode by number
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('*')
      .eq('show_id', show.id)
      .eq('episode_number', episodeNumber)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json(
        { success: false, error: `Episode #${episodeNumber} not found` },
        { status: 404, headers: corsHeaders }
      );
    }

    // Get navigation info (prev/next episodes)
    const [prevResult, nextResult] = await Promise.all([
      supabase
        .from('episodes')
        .select('id, episode_number, title')
        .eq('show_id', show.id)
        .lt('episode_number', episodeNumber)
        .order('episode_number', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('episodes')
        .select('id, episode_number, title')
        .eq('show_id', show.id)
        .gt('episode_number', episodeNumber)
        .order('episode_number', { ascending: true })
        .limit(1)
        .single(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        show: {
          id: show.id,
          name: show.name,
          slug: show.slug,
        },
        episode,
        navigation: {
          prev: prevResult.data || null,
          next: nextResult.data || null,
        },
      },
    }, { headers: corsHeaders });

  } catch (err) {
    console.error('GET /api/shows/[slug]/episodes/by-number/[number] error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
