import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/tags/co-occurrence
 *
 * Track tag co-occurrence by incrementing counts when tags are used together.
 * This builds the foundation for "often used together" suggestions.
 *
 * Body:
 * {
 *   tagIds: ["uuid1", "uuid2", "uuid3"]  // Array of tag UUIDs
 * }
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     tracked: 3,  // Number of tag pairs tracked
 *     message: "Co-occurrence tracked for 3 tag pairs"
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tagIds } = body;

    // Validate input
    if (!tagIds || !Array.isArray(tagIds) || tagIds.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'tagIds must be an array with at least 2 tag UUIDs',
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Call the database function to increment co-occurrence
    const { data, error } = await supabase.rpc('increment_tag_co_occurrence', {
      p_tag_ids: tagIds,
    });

    if (error) {
      console.error('Error tracking co-occurrence:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500, headers: corsHeaders }
      );
    }

    // Calculate number of pairs (combinations of 2 from n tags)
    const pairCount = (tagIds.length * (tagIds.length - 1)) / 2;

    return NextResponse.json(
      {
        success: true,
        data: {
          tracked: pairCount,
          message: `Co-occurrence tracked for ${pairCount} tag pair${pairCount !== 1 ? 's' : ''}`,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Unexpected error in /api/tags/co-occurrence:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
