import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * OPTIONS /api/content/count
 * Handle preflight requests
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/content/count
 * Get total count of content items in the database
 *
 * Optional query params:
 * - platform: Filter by platform (twitter, youtube, reddit, bluesky)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const platform = searchParams.get('platform');

    // Build query
    let query = supabase
      .from('content')
      .select('id', { count: 'exact', head: true });

    // Filter by platform if specified
    if (platform) {
      query = query.eq('platform', platform);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error counting content:', error);
      return NextResponse.json(
        { error: 'Failed to count content' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        total: count || 0,
        platform: platform || 'all'
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
