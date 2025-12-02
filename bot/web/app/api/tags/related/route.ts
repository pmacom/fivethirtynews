import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/tags/related
 *
 * Get tags related to a specific tag with relationship strength scores.
 * Uses the get_related_tags() database function for bidirectional lookups.
 *
 * Query Parameters:
 * - tagId (required): UUID of the tag to find relationships for
 * - tagSlug (optional): Alternative to tagId - find by slug instead
 * - minStrength (optional): Minimum relationship strength (0.0-1.0), default 0.5
 * - relationshipType (optional): Filter by type ('related', 'tool_of', 'technique_of', 'part_of')
 * - limit (optional): Maximum number of results, default 20
 *
 * Returns:
 * {
 *   success: true,
 *   data: [
 *     {
 *       tagId: "uuid",
 *       tagName: "Blender",
 *       tagSlug: "blender",
 *       relationshipType: "tool_of",
 *       strength: 0.95,
 *       direction: "outbound" | "inbound"
 *     }
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    let tagId = searchParams.get('tagId');
    const tagSlug = searchParams.get('tagSlug');
    const minStrength = parseFloat(searchParams.get('minStrength') || '0.5');
    const relationshipType = searchParams.get('relationshipType');
    const limit = parseInt(searchParams.get('limit') || '20');

    // If slug provided instead of ID, look up the ID
    if (!tagId && tagSlug) {
      const { data: tag, error: tagError } = await supabase
        .from('tags')
        .select('id')
        .eq('slug', tagSlug)
        .single();

      if (tagError || !tag) {
        return NextResponse.json(
          {
            success: false,
            error: `Tag not found: ${tagSlug}`,
          },
          { status: 404, headers: corsHeaders }
        );
      }

      tagId = tag.id;
    }

    // Validate required parameters
    if (!tagId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: tagId or tagSlug',
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate strength range
    if (minStrength < 0 || minStrength > 1) {
      return NextResponse.json(
        {
          success: false,
          error: 'minStrength must be between 0.0 and 1.0',
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Call the database function
    const { data, error } = await supabase.rpc('get_related_tags', {
      p_tag_id: tagId,
      p_min_strength: minStrength,
      p_relationship_type: relationshipType || null,
    });

    if (error) {
      console.error('Error fetching related tags:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500, headers: corsHeaders }
      );
    }

    // Apply limit
    const limitedData = data ? data.slice(0, limit) : [];

    // Transform snake_case to camelCase for response
    const formattedData = limitedData.map((row: any) => ({
      tagId: row.tag_id,
      tagName: row.tag_name,
      tagSlug: row.tag_slug,
      relationshipType: row.relationship_type,
      strength: parseFloat(row.strength),
      direction: row.direction,
    }));

    return NextResponse.json(
      {
        success: true,
        data: formattedData,
        meta: {
          count: formattedData.length,
          tagId,
          minStrength,
          relationshipType: relationshipType || 'all',
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Unexpected error in /api/tags/related:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
