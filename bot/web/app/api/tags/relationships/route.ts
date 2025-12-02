import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/tags/relationships
 *
 * Retrieve all tag relationships, optionally filtered.
 *
 * Query Parameters:
 * - tagId (optional): Filter relationships involving this tag (either side)
 * - relationshipType (optional): Filter by type ('related', 'tool_of', 'technique_of', 'part_of')
 * - minStrength (optional): Minimum strength threshold (0.0-1.0)
 * - limit (optional): Maximum results, default 100
 *
 * Returns:
 * {
 *   success: true,
 *   data: [
 *     {
 *       id: "uuid",
 *       tag1: { id: "uuid", name: "Blender", slug: "blender" },
 *       tag2: { id: "uuid", name: "3D Development", slug: "3d-development" },
 *       relationshipType: "tool_of",
 *       strength: 0.95,
 *       createdAt: "2025-10-19T..."
 *     }
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tagId = searchParams.get('tagId');
    const relationshipType = searchParams.get('relationshipType');
    const minStrength = parseFloat(searchParams.get('minStrength') || '0.0');
    const limit = parseInt(searchParams.get('limit') || '100');

    let query = supabase
      .from('tag_relationships')
      .select(`
        id,
        tag_id_1,
        tag_id_2,
        relationship_type,
        strength,
        created_at,
        tag1:tags!tag_relationships_tag_id_1_fkey(id, name, slug),
        tag2:tags!tag_relationships_tag_id_2_fkey(id, name, slug)
      `);

    if (tagId) {
      query = query.or(`tag_id_1.eq.${tagId},tag_id_2.eq.${tagId}`);
    }

    if (relationshipType) {
      query = query.eq('relationship_type', relationshipType);
    }

    if (minStrength > 0) {
      query = query.gte('strength', minStrength);
    }

    query = query.order('strength', { ascending: false }).limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching relationships:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500, headers: corsHeaders }
      );
    }

    // Format response
    const formattedData = data?.map((rel: any) => ({
      id: rel.id,
      tag1: rel.tag1,
      tag2: rel.tag2,
      relationshipType: rel.relationship_type,
      strength: parseFloat(rel.strength),
      createdAt: rel.created_at,
    })) || [];

    return NextResponse.json(
      {
        success: true,
        data: formattedData,
        meta: {
          count: formattedData.length,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Unexpected error in GET /api/tags/relationships:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/tags/relationships
 *
 * Create new tag relationships manually.
 *
 * Body (single relationship):
 * {
 *   tag1: "blender" | "uuid",  // slug or UUID
 *   tag2: "3d-development" | "uuid",
 *   relationshipType: "tool_of",
 *   strength: 0.95  // 0.0-1.0
 * }
 *
 * Body (batch relationships):
 * {
 *   relationships: [
 *     { tag1: "blender", tag2: "3d-development", relationshipType: "tool_of", strength: 0.95 },
 *     { tag1: "godot", tag2: "3d-development", relationshipType: "tool_of", strength: 0.92 }
 *   ]
 * }
 *
 * Returns:
 * {
 *   success: true,
 *   data: { created: 1, relationships: [...] }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Support both single and batch operations
    const relationships = body.relationships || [body];

    if (!Array.isArray(relationships) || relationships.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request: provide either a single relationship or an array in "relationships"',
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate and resolve tag IDs
    const resolvedRelationships = [];

    for (const rel of relationships) {
      const { tag1, tag2, relationshipType, strength } = rel;

      // Validate required fields
      if (!tag1 || !tag2 || !relationshipType || strength === undefined) {
        return NextResponse.json(
          {
            success: false,
            error: 'Each relationship must have: tag1, tag2, relationshipType, strength',
          },
          { status: 400, headers: corsHeaders }
        );
      }

      // Validate relationship type
      const validTypes = ['related', 'tool_of', 'technique_of', 'part_of'];
      if (!validTypes.includes(relationshipType)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid relationshipType. Must be one of: ${validTypes.join(', ')}`,
          },
          { status: 400, headers: corsHeaders }
        );
      }

      // Validate strength
      if (strength < 0 || strength > 1) {
        return NextResponse.json(
          {
            success: false,
            error: 'Strength must be between 0.0 and 1.0',
          },
          { status: 400, headers: corsHeaders }
        );
      }

      // Resolve tag IDs (handle both UUIDs and slugs)
      const tag1Id = await resolveTagId(tag1);
      const tag2Id = await resolveTagId(tag2);

      if (!tag1Id || !tag2Id) {
        return NextResponse.json(
          {
            success: false,
            error: `Tag not found: ${!tag1Id ? tag1 : tag2}`,
          },
          { status: 404, headers: corsHeaders }
        );
      }

      // Prevent self-relationships
      if (tag1Id === tag2Id) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot create relationship between a tag and itself',
          },
          { status: 400, headers: corsHeaders }
        );
      }

      resolvedRelationships.push({
        tag_id_1: tag1Id,
        tag_id_2: tag2Id,
        relationship_type: relationshipType,
        strength,
      });
    }

    // Insert relationships (upsert to handle duplicates)
    const { data, error } = await supabase
      .from('tag_relationships')
      .upsert(resolvedRelationships, {
        onConflict: 'tag_id_1,tag_id_2,relationship_type',
        ignoreDuplicates: false,
      })
      .select(`
        id,
        tag_id_1,
        tag_id_2,
        relationship_type,
        strength,
        created_at,
        tag1:tags!tag_relationships_tag_id_1_fkey(id, name, slug),
        tag2:tags!tag_relationships_tag_id_2_fkey(id, name, slug)
      `);

    if (error) {
      console.error('Error creating relationships:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500, headers: corsHeaders }
      );
    }

    // Format response
    const formattedData = data?.map((rel: any) => ({
      id: rel.id,
      tag1: rel.tag1,
      tag2: rel.tag2,
      relationshipType: rel.relationship_type,
      strength: parseFloat(rel.strength),
      createdAt: rel.created_at,
    })) || [];

    return NextResponse.json(
      {
        success: true,
        data: {
          created: formattedData.length,
          relationships: formattedData,
        },
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Unexpected error in POST /api/tags/relationships:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/tags/relationships
 *
 * Delete a tag relationship by ID.
 *
 * Query Parameters:
 * - id (required): UUID of the relationship to delete
 *
 * Returns:
 * {
 *   success: true,
 *   data: { deleted: true, id: "uuid" }
 * }
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: id',
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const { error } = await supabase
      .from('tag_relationships')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting relationship:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          deleted: true,
          id,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Unexpected error in DELETE /api/tags/relationships:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Helper function to resolve tag ID from slug or UUID
async function resolveTagId(identifier: string): Promise<string | null> {
  // Check if it's already a UUID (basic validation)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(identifier)) {
    // Verify the UUID exists
    const { data } = await supabase
      .from('tags')
      .select('id')
      .eq('id', identifier)
      .single();

    return data?.id || null;
  }

  // Otherwise, treat as slug
  const { data } = await supabase
    .from('tags')
    .select('id')
    .eq('slug', identifier)
    .single();

  return data?.id || null;
}
