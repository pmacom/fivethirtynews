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
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

/**
 * GET /api/tags/relationships/vote
 *
 * Get user's votes on tag relationships.
 *
 * Query Parameters:
 * - relationshipId (optional): Get vote for specific relationship
 * - tagId1, tagId2 (optional): Get vote for specific tag pair
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     vote: 'agree' | 'disagree' | 'unsure' | null,
 *     createdAt: "2025-...",
 *     reason: "..."
 *   }
 * }
 */
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const relationshipId = searchParams.get('relationshipId')
    const tagId1 = searchParams.get('tagId1')
    const tagId2 = searchParams.get('tagId2')

    let query = supabaseAdmin
      .from('tag_relationship_feedback')
      .select('*')
      .eq('user_id', user.id)

    if (relationshipId) {
      query = query.eq('tag_relationship_id', relationshipId)
    } else if (tagId1 && tagId2) {
      query = query
        .is('tag_relationship_id', null)
        .eq('tag_id_1', tagId1)
        .eq('tag_id_2', tagId2)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      console.error('Error fetching vote:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: data ? {
          vote: data.vote,
          suggestedType: data.suggested_type,
          reason: data.reason,
          createdAt: data.created_at,
        } : null,
      },
      { headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('Unexpected error in GET /api/tags/relationships/vote:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

/**
 * POST /api/tags/relationships/vote
 *
 * Submit or update a vote on a tag relationship.
 *
 * Body:
 * {
 *   relationshipId?: string,  // Vote on existing relationship
 *   tagId1?: string,          // Or vote on tag pair (for suggestions)
 *   tagId2?: string,
 *   vote: 'agree' | 'disagree' | 'unsure',
 *   suggestedType?: string,   // If suggesting relationship type
 *   reason?: string           // Optional reason for vote
 * }
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     id: "uuid",
 *     vote: "agree",
 *     isNew: true | false
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
    const { relationshipId, tagId1, tagId2, vote, suggestedType, reason } = body

    // Validate vote value
    const validVotes = ['agree', 'disagree', 'unsure']
    if (!vote || !validVotes.includes(vote)) {
      return NextResponse.json(
        { success: false, error: `Invalid vote. Must be one of: ${validVotes.join(', ')}` },
        { status: 400, headers: corsHeaders }
      )
    }

    // Must have either relationshipId OR both tagIds
    if (!relationshipId && (!tagId1 || !tagId2)) {
      return NextResponse.json(
        { success: false, error: 'Provide either relationshipId or both tagId1 and tagId2' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate suggested type if provided
    if (suggestedType) {
      const validTypes = ['related', 'tool_of', 'technique_of', 'part_of']
      if (!validTypes.includes(suggestedType)) {
        return NextResponse.json(
          { success: false, error: `Invalid suggestedType. Must be one of: ${validTypes.join(', ')}` },
          { status: 400, headers: corsHeaders }
        )
      }
    }

    // Verify relationship exists if voting on existing
    if (relationshipId) {
      const { data: relationship, error: relError } = await supabaseAdmin
        .from('tag_relationships')
        .select('id')
        .eq('id', relationshipId)
        .single()

      if (relError || !relationship) {
        return NextResponse.json(
          { success: false, error: 'Relationship not found' },
          { status: 404, headers: corsHeaders }
        )
      }
    }

    // Verify tags exist if voting on tag pair
    if (tagId1 && tagId2) {
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

      // Prevent self-voting
      if (tagId1 === tagId2) {
        return NextResponse.json(
          { success: false, error: 'Cannot vote on relationship between same tag' },
          { status: 400, headers: corsHeaders }
        )
      }
    }

    // Build feedback record
    const feedbackData: Record<string, any> = {
      user_id: user.id,
      vote,
      updated_at: new Date().toISOString(),
    }

    if (relationshipId) {
      feedbackData.tag_relationship_id = relationshipId
    } else {
      feedbackData.tag_id_1 = tagId1
      feedbackData.tag_id_2 = tagId2
    }

    if (suggestedType) {
      feedbackData.suggested_type = suggestedType
    }

    if (reason) {
      feedbackData.reason = reason
    }

    // Check if vote already exists
    let existingQuery = supabaseAdmin
      .from('tag_relationship_feedback')
      .select('id')
      .eq('user_id', user.id)

    if (relationshipId) {
      existingQuery = existingQuery.eq('tag_relationship_id', relationshipId)
    } else {
      existingQuery = existingQuery
        .is('tag_relationship_id', null)
        .eq('tag_id_1', tagId1)
        .eq('tag_id_2', tagId2)
    }

    const { data: existing } = await existingQuery.maybeSingle()

    let result
    let isNew = false

    if (existing) {
      // Update existing vote
      const { data, error } = await supabaseAdmin
        .from('tag_relationship_feedback')
        .update(feedbackData)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating vote:', error)
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500, headers: corsHeaders }
        )
      }
      result = data
    } else {
      // Insert new vote
      isNew = true
      const { data, error } = await supabaseAdmin
        .from('tag_relationship_feedback')
        .insert(feedbackData)
        .select()
        .single()

      if (error) {
        console.error('Error inserting vote:', error)
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500, headers: corsHeaders }
        )
      }
      result = data
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: result.id,
          vote: result.vote,
          isNew,
        },
      },
      { status: isNew ? 201 : 200, headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('Unexpected error in POST /api/tags/relationships/vote:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

/**
 * DELETE /api/tags/relationships/vote
 *
 * Remove user's vote on a tag relationship.
 *
 * Query Parameters:
 * - relationshipId (optional): Remove vote for specific relationship
 * - tagId1, tagId2 (optional): Remove vote for specific tag pair
 *
 * Returns:
 * {
 *   success: true,
 *   data: { deleted: true }
 * }
 */
export async function DELETE(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const relationshipId = searchParams.get('relationshipId')
    const tagId1 = searchParams.get('tagId1')
    const tagId2 = searchParams.get('tagId2')

    if (!relationshipId && (!tagId1 || !tagId2)) {
      return NextResponse.json(
        { success: false, error: 'Provide either relationshipId or both tagId1 and tagId2' },
        { status: 400, headers: corsHeaders }
      )
    }

    let query = supabaseAdmin
      .from('tag_relationship_feedback')
      .delete()
      .eq('user_id', user.id)

    if (relationshipId) {
      query = query.eq('tag_relationship_id', relationshipId)
    } else {
      query = query
        .is('tag_relationship_id', null)
        .eq('tag_id_1', tagId1)
        .eq('tag_id_2', tagId2)
    }

    const { error } = await query

    if (error) {
      console.error('Error deleting vote:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      { success: true, data: { deleted: true } },
      { headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('Unexpected error in DELETE /api/tags/relationships/vote:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
