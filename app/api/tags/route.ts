import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * OPTIONS /api/tags
 * Handle preflight requests
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/tags
 * Fetch all tags sorted by usage count for autocomplete
 *
 * Query params:
 *   - limit: max tags to return (default: 100)
 *   - search: filter by name/slug containing this string
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const search = searchParams.get('search');

    let query = supabase
      .from('tags')
      .select('id, slug, name, usage_count')
      .order('usage_count', { ascending: false })
      .limit(limit);

    // Filter by search term if provided
    if (search && search.length >= 1) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    const { data: tags, error } = await query;

    if (error) {
      console.error('Error fetching tags:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch tags' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      tags: tags || []
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
