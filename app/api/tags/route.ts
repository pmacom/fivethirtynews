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
 * Also includes channel slugs as virtual tags for unified autocomplete
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
    const search = searchParams.get('search')?.toLowerCase();

    // Fetch predefined tags from tags table
    let tagsQuery = supabase
      .from('tags')
      .select('id, slug, name, usage_count')
      .order('usage_count', { ascending: false })
      .limit(limit);

    if (search && search.length >= 1) {
      tagsQuery = tagsQuery.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    const { data: predefinedTags, error: tagsError } = await tagsQuery;

    if (tagsError) {
      console.error('Error fetching tags:', tagsError);
    }

    // Also get unique tags from content.tags array (user-created tags)
    // and compute actual usage counts
    const { data: contentTags, error: contentError } = await supabase
      .rpc('get_tag_usage_counts');

    if (contentError) {
      console.error('Error fetching content tags:', contentError);
    }

    // Merge predefined tags with content tags
    const tagMap = new Map<string, { id: string; slug: string; name: string; usage_count: number }>();

    // Add predefined tags first
    for (const tag of (predefinedTags || [])) {
      tagMap.set(tag.slug, tag);
    }

    // Update/add from content tags with real counts
    for (const ct of (contentTags || [])) {
      const existing = tagMap.get(ct.tag_slug);
      if (existing) {
        existing.usage_count = ct.usage_count;
      } else {
        // User-created tag not in predefined list
        tagMap.set(ct.tag_slug, {
          id: ct.tag_slug, // Use slug as ID for user tags
          slug: ct.tag_slug,
          name: ct.tag_slug, // Capitalize first letter
          usage_count: ct.usage_count
        });
      }
    }

    // Convert to array and sort by usage_count
    let tags = Array.from(tagMap.values())
      .sort((a, b) => b.usage_count - a.usage_count);

    // Filter by search if provided
    if (search && search.length >= 1) {
      tags = tags.filter(t =>
        t.name.toLowerCase().includes(search) ||
        t.slug.toLowerCase().includes(search)
      );
    }

    // Limit results
    tags = tags.slice(0, limit);

    return NextResponse.json({
      success: true,
      tags
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
