import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

/**
 * GET /api/tags/relationships/suggest
 *
 * Get pending relationship suggestions for curator review.
 *
 * Query Parameters:
 * - status (optional): Filter by status ('pending', 'approved', 'rejected', 'merged'), default 'pending'
 * - limit (optional): Maximum results, default 20
 * - offset (optional): Pagination offset, default 0
 * - sortBy (optional): 'votes' (agree_count - disagree_count) or 'recent', default 'votes'
 *
 * Returns:
 * {
 *   success: true,
 *   data: [
 *     {
 *       id: "uuid",
 *       tag1: { id, name, slug },
 *       tag2: { id, name, slug },
 *       suggestedType: "related",
 *       suggestedStrength: 0.7,
 *       suggestedBy: { id, email } | null,
 *       suggestionReason: "...",
 *       agreeCount: 5,
 *       disagreeCount: 1,
 *       status: "pending",
 *       createdAt: "..."
 *     }
 *   ],
 *   meta: { total, limit, offset }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'pending'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const sortBy = searchParams.get('sortBy') || 'votes'

    // Validate status
    const validStatuses = ['pending', 'approved', 'rejected', 'merged']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get total count for pagination
    const { count: total } = await supabaseAdmin
      .from('tag_relationship_suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('status', status)

    // Build query
    let query = supabaseAdmin
      .from('tag_relationship_suggestions')
      .select(`
        id,
        tag_id_1,
        tag_id_2,
        suggested_type,
        suggested_strength,
        suggested_by,
        suggestion_reason,
        agree_count,
        disagree_count,
        status,
        resolved_by,
        resolved_at,
        resolution_notes,
        created_relationship_id,
        created_at,
        tag1:tags!tag_relationship_suggestions_tag_id_1_fkey(id, name, slug),
        tag2:tags!tag_relationship_suggestions_tag_id_2_fkey(id, name, slug)
      `)
      .eq('status', status)

    // Apply sorting
    if (sortBy === 'votes') {
      // Sort by net votes (agree - disagree), then by recent
      query = query
        .order('agree_count', { ascending: false })
        .order('created_at', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching suggestions:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: corsHeaders }
      )
    }

    // Get user info for suggested_by if present
    const userIds = data?.filter(s => s.suggested_by).map(s => s.suggested_by) || []
    let usersMap: Record<string, { id: string; email: string }> = {}

    if (userIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from('auth.users')
        .select('id, email')
        .in('id', userIds)

      if (users) {
        usersMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {})
      }
    }

    // Format response
    const formattedData = data?.map((s: any) => ({
      id: s.id,
      tag1: s.tag1,
      tag2: s.tag2,
      suggestedType: s.suggested_type,
      suggestedStrength: parseFloat(s.suggested_strength),
      suggestedBy: s.suggested_by ? usersMap[s.suggested_by] || { id: s.suggested_by } : null,
      suggestionReason: s.suggestion_reason,
      agreeCount: s.agree_count,
      disagreeCount: s.disagree_count,
      netVotes: s.agree_count - s.disagree_count,
      status: s.status,
      resolvedBy: s.resolved_by,
      resolvedAt: s.resolved_at,
      resolutionNotes: s.resolution_notes,
      createdRelationshipId: s.created_relationship_id,
      createdAt: s.created_at,
    })) || []

    return NextResponse.json(
      {
        success: true,
        data: formattedData,
        meta: {
          total: total || 0,
          limit,
          offset,
        },
      },
      { headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('Unexpected error in GET /api/tags/relationships/suggest:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

/**
 * POST /api/tags/relationships/suggest
 *
 * Suggest a new tag relationship.
 *
 * Body:
 * {
 *   tagId1: string,           // First tag UUID
 *   tagId2: string,           // Second tag UUID
 *   relationshipType: string, // 'related', 'tool_of', 'technique_of', 'part_of'
 *   strength?: number,        // Suggested strength 0.0-1.0, default 0.7
 *   reason?: string           // Why you think this relationship exists
 * }
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     id: "uuid",
 *     isNew: true,
 *     existingRelationship?: { id, strength }  // If relationship already exists
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const cookieStore = await cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      )
    }

    const body = await request.json()
    const { tagId1, tagId2, relationshipType, strength = 0.7, reason } = body

    // Validate required fields
    if (!tagId1 || !tagId2 || !relationshipType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: tagId1, tagId2, relationshipType' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate relationship type
    const validTypes = ['related', 'tool_of', 'technique_of', 'part_of']
    if (!validTypes.includes(relationshipType)) {
      return NextResponse.json(
        { success: false, error: `Invalid relationshipType. Must be one of: ${validTypes.join(', ')}` },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate strength
    if (strength < 0 || strength > 1) {
      return NextResponse.json(
        { success: false, error: 'Strength must be between 0.0 and 1.0' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Prevent self-suggestion
    if (tagId1 === tagId2) {
      return NextResponse.json(
        { success: false, error: 'Cannot suggest relationship between same tag' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Verify tags exist
    const { data: tags, error: tagsError } = await supabaseAdmin
      .from('tags')
      .select('id')
      .in('id', [tagId1, tagId2])

    if (tagsError || !tags || tags.length !== 2) {
      return NextResponse.json(
        { success: false, error: 'One or both tags not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Check if relationship already exists
    const { data: existing } = await supabaseAdmin
      .from('tag_relationships')
      .select('id, strength')
      .or(`and(tag_id_1.eq.${tagId1},tag_id_2.eq.${tagId2}),and(tag_id_1.eq.${tagId2},tag_id_2.eq.${tagId1})`)
      .eq('relationship_type', relationshipType)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        {
          success: true,
          data: {
            id: null,
            isNew: false,
            existingRelationship: {
              id: existing.id,
              strength: parseFloat(existing.strength),
            },
            message: 'Relationship already exists. Vote on the existing relationship instead.',
          },
        },
        { headers: corsHeaders }
      )
    }

    // Check if suggestion already exists
    const { data: existingSuggestion } = await supabaseAdmin
      .from('tag_relationship_suggestions')
      .select('id, status, agree_count, disagree_count')
      .or(`and(tag_id_1.eq.${tagId1},tag_id_2.eq.${tagId2}),and(tag_id_1.eq.${tagId2},tag_id_2.eq.${tagId1})`)
      .eq('suggested_type', relationshipType)
      .maybeSingle()

    if (existingSuggestion) {
      // If pending, increment agree count as implicit vote
      if (existingSuggestion.status === 'pending') {
        // Check if user already voted
        const { data: existingVote } = await supabaseAdmin
          .from('tag_relationship_feedback')
          .select('id')
          .eq('user_id', user.id)
          .or(`and(tag_id_1.eq.${tagId1},tag_id_2.eq.${tagId2}),and(tag_id_1.eq.${tagId2},tag_id_2.eq.${tagId1})`)
          .maybeSingle()

        if (!existingVote) {
          // Add implicit agree vote
          await supabaseAdmin
            .from('tag_relationship_feedback')
            .insert({
              tag_id_1: tagId1,
              tag_id_2: tagId2,
              user_id: user.id,
              vote: 'agree',
              suggested_type: relationshipType,
            })
        }
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            id: existingSuggestion.id,
            isNew: false,
            message: 'Suggestion already exists. Your vote has been recorded.',
            status: existingSuggestion.status,
          },
        },
        { headers: corsHeaders }
      )
    }

    // Create new suggestion
    const { data: newSuggestion, error: insertError } = await supabaseAdmin
      .from('tag_relationship_suggestions')
      .insert({
        tag_id_1: tagId1,
        tag_id_2: tagId2,
        suggested_type: relationshipType,
        suggested_strength: strength,
        suggested_by: user.id,
        suggestion_reason: reason || null,
        agree_count: 1, // Creator implicitly agrees
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating suggestion:', insertError)
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500, headers: corsHeaders }
      )
    }

    // Add creator's implicit agree vote
    await supabaseAdmin
      .from('tag_relationship_feedback')
      .insert({
        tag_id_1: tagId1,
        tag_id_2: tagId2,
        user_id: user.id,
        vote: 'agree',
        suggested_type: relationshipType,
        reason: reason || null,
      })

    return NextResponse.json(
      {
        success: true,
        data: {
          id: newSuggestion.id,
          isNew: true,
        },
      },
      { status: 201, headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('Unexpected error in POST /api/tags/relationships/suggest:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
