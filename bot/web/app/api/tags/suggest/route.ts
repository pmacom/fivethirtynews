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
 * GET /api/tags/suggest
 *
 * Smart tag suggestion endpoint combining:
 * 1. Fuzzy text search (pg_trgm) for partial matching
 * 2. Semantic relationships (60% weight) from tag_relationships
 * 3. Usage patterns (40% weight) from tag_co_occurrence
 *
 * Query Parameters:
 * - input (optional): Text to search for (fuzzy matches tag names)
 * - tagIds (optional): Comma-separated UUIDs of already-selected tags
 * - tagSlugs (optional): Comma-separated slugs (alternative to tagIds)
 * - minStrength (optional): Minimum relationship strength (0.0-1.0), default 0.5
 * - minConfidence (optional): Minimum co-occurrence confidence, default 0.1
 * - limit (optional): Maximum results, default 10
 * - mode (optional): 'hybrid' (default), 'relationships', 'fuzzy'
 *
 * Examples:
 * - /api/tags/suggest?input=blend
 *   -> Returns tags matching "blend" (fuzzy): Blender, etc.
 *
 * - /api/tags/suggest?tagSlugs=blender,animation
 *   -> Returns tags related to both Blender and Animation
 *
 * - /api/tags/suggest?input=3d&tagSlugs=blender
 *   -> Combines fuzzy search for "3d" + tags related to "blender"
 *
 * Returns:
 * {
 *   success: true,
 *   data: [
 *     {
 *       tagId: "uuid",
 *       tagName: "3D Development",
 *       tagSlug: "3d-development",
 *       score: 0.92,
 *       source: "both" | "relationship" | "co-occurrence" | "fuzzy",
 *       matchType?: "name" | "description" // for fuzzy results
 *     }
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const input = searchParams.get('input');
    const tagIdsParam = searchParams.get('tagIds');
    const tagSlugsParam = searchParams.get('tagSlugs');
    const minStrength = parseFloat(searchParams.get('minStrength') || '0.5');
    const minConfidence = parseFloat(searchParams.get('minConfidence') || '0.1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const mode = searchParams.get('mode') || 'hybrid';

    let tagIds: string[] = [];

    // Parse tag IDs from parameter
    if (tagIdsParam) {
      tagIds = tagIdsParam.split(',').map(id => id.trim()).filter(Boolean);
    }

    // Convert slugs to IDs if provided
    if (tagSlugsParam && !tagIdsParam) {
      const slugs = tagSlugsParam.split(',').map(s => s.trim()).filter(Boolean);

      if (slugs.length > 0) {
        const { data: tags, error: tagsError } = await supabase
          .from('tags')
          .select('id')
          .in('slug', slugs);

        if (tagsError) {
          console.error('Error fetching tags by slugs:', tagsError);
        } else if (tags) {
          tagIds = tags.map(t => t.id);
        }
      }
    }

    // If no input and no tags, return error
    if (!input && tagIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Must provide either "input" (text search) or "tagIds/tagSlugs" (relationship-based suggestions)',
        },
        { status: 400, headers: corsHeaders }
      );
    }

    let results: any[] = [];

    // Mode 1: Fuzzy text search only
    if (mode === 'fuzzy' || (input && tagIds.length === 0)) {
      const { data, error } = await supabase
        .from('tags')
        .select('id, name, slug, description')
        .or(`name.ilike.%${input}%,slug.ilike.%${input}%,description.ilike.%${input}%`)
        .limit(limit);

      if (error) {
        console.error('Error in fuzzy search:', error);
      } else if (data) {
        results = data.map((tag: any) => ({
          tagId: tag.id,
          tagName: tag.name,
          tagSlug: tag.slug,
          score: 1.0, // Exact matches get max score
          source: 'fuzzy',
          matchType: tag.name.toLowerCase().includes(input?.toLowerCase() || '')
            ? 'name'
            : 'description',
        }));
      }
    }

    // Mode 2: Relationship-based suggestions only
    else if (mode === 'relationships' && tagIds.length > 0) {
      const { data, error } = await supabase.rpc('suggest_tags_by_relationships', {
        p_tag_ids: tagIds,
        p_min_strength: minStrength,
        p_limit: limit,
      });

      if (error) {
        console.error('Error fetching relationship suggestions:', error);
      } else if (data) {
        results = data.map((row: any) => ({
          tagId: row.tag_id,
          tagName: row.tag_name,
          tagSlug: row.tag_slug,
          score: parseFloat(row.avg_strength),
          source: 'relationship',
          matchCount: row.match_count,
        }));
      }
    }

    // Mode 3: Hybrid (default) - combines relationships + co-occurrence
    else if (mode === 'hybrid' && tagIds.length > 0) {
      const { data, error } = await supabase.rpc('suggest_tags_hybrid', {
        p_tag_ids: tagIds,
        p_min_strength: minStrength,
        p_min_confidence: minConfidence,
        p_limit: limit,
      });

      if (error) {
        console.error('Error fetching hybrid suggestions:', error);
      } else if (data) {
        results = data.map((row: any) => ({
          tagId: row.tag_id,
          tagName: row.tag_name,
          tagSlug: row.tag_slug,
          score: parseFloat(row.score),
          source: row.source,
        }));
      }

      // If input text is also provided, boost fuzzy matches
      if (input) {
        const { data: fuzzyData } = await supabase
          .from('tags')
          .select('id, name, slug')
          .or(`name.ilike.%${input}%,slug.ilike.%${input}%,description.ilike.%${input}%`)
          .limit(5);

        if (fuzzyData) {
          // Merge fuzzy results with hybrid results
          const fuzzyResults = fuzzyData.map((tag: any) => ({
            tagId: tag.id,
            tagName: tag.name,
            tagSlug: tag.slug,
            score: 0.95, // High score for fuzzy matches
            source: 'fuzzy',
          }));

          // Combine and deduplicate
          const existingIds = new Set(results.map(r => r.tagId));
          const newFuzzyResults = fuzzyResults.filter(r => !existingIds.has(r.tagId));

          results = [...newFuzzyResults, ...results].slice(0, limit);
        }
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return NextResponse.json(
      {
        success: true,
        data: results,
        meta: {
          count: results.length,
          mode,
          input: input || null,
          tagCount: tagIds.length,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Unexpected error in /api/tags/suggest:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
