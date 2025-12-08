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
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

/**
 * POST /api/tags/relationships/approve
 *
 * Curator action to approve, reject, or modify a suggestion.
 *
 * Body:
 * {
 *   suggestionId: string,              // UUID of the suggestion
 *   action: 'approve' | 'reject' | 'modify',
 *   strength?: number,                 // Override strength (0.0-1.0)
 *   relationshipType?: string,         // Override type
 *   notes?: string                     // Curator notes
 * }
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     suggestionId: "uuid",
 *     action: "approve",
 *     createdRelationshipId?: "uuid"  // If approved
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user (curator)
    const cookieStore = await cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      )
    }

    // TODO: Add curator role check here
    // For now, any authenticated user can approve (should be restricted in production)

    const body = await request.json()
    const { suggestionId, action, strength, relationshipType, notes } = body

    // Validate required fields
    if (!suggestionId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: suggestionId, action' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate action
    const validActions = ['approve', 'reject', 'modify']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate strength if provided
    if (strength !== undefined && (strength < 0 || strength > 1)) {
      return NextResponse.json(
        { success: false, error: 'Strength must be between 0.0 and 1.0' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate relationship type if provided
    if (relationshipType) {
      const validTypes = ['related', 'tool_of', 'technique_of', 'part_of']
      if (!validTypes.includes(relationshipType)) {
        return NextResponse.json(
          { success: false, error: `Invalid relationshipType. Must be one of: ${validTypes.join(', ')}` },
          { status: 400, headers: corsHeaders }
        )
      }
    }

    // Get the suggestion
    const { data: suggestion, error: suggestionError } = await supabaseAdmin
      .from('tag_relationship_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .single()

    if (suggestionError || !suggestion) {
      return NextResponse.json(
        { success: false, error: 'Suggestion not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Check suggestion is still pending
    if (suggestion.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Suggestion already ${suggestion.status}` },
        { status: 400, headers: corsHeaders }
      )
    }

    const now = new Date().toISOString()
    let createdRelationshipId: string | null = null

    if (action === 'approve' || action === 'modify') {
      // Create the relationship
      const finalStrength = strength ?? suggestion.suggested_strength
      const finalType = relationshipType ?? suggestion.suggested_type

      // Check if relationship already exists (edge case: created between suggestion and approval)
      const { data: existing } = await supabaseAdmin
        .from('tag_relationships')
        .select('id')
        .or(`and(tag_id_1.eq.${suggestion.tag_id_1},tag_id_2.eq.${suggestion.tag_id_2}),and(tag_id_1.eq.${suggestion.tag_id_2},tag_id_2.eq.${suggestion.tag_id_1})`)
        .eq('relationship_type', finalType)
        .maybeSingle()

      if (existing) {
        // Merge with existing - update strength if higher, mark suggestion as merged
        const { data: existingRel } = await supabaseAdmin
          .from('tag_relationships')
          .select('strength')
          .eq('id', existing.id)
          .single()

        if (existingRel && finalStrength > parseFloat(existingRel.strength)) {
          await supabaseAdmin
            .from('tag_relationships')
            .update({
              strength: finalStrength,
              curator_approved_by: user.id,
              curator_approved_at: now,
              curator_notes: notes || null,
            })
            .eq('id', existing.id)
        }

        // Mark suggestion as merged
        await supabaseAdmin
          .from('tag_relationship_suggestions')
          .update({
            status: 'merged',
            resolved_by: user.id,
            resolved_at: now,
            resolution_notes: notes || 'Merged with existing relationship',
            created_relationship_id: existing.id,
          })
          .eq('id', suggestionId)

        return NextResponse.json(
          {
            success: true,
            data: {
              suggestionId,
              action: 'merged',
              createdRelationshipId: existing.id,
              message: 'Merged with existing relationship',
            },
          },
          { headers: corsHeaders }
        )
      }

      // Create new relationship
      const { data: newRelationship, error: createError } = await supabaseAdmin
        .from('tag_relationships')
        .insert({
          tag_id_1: suggestion.tag_id_1,
          tag_id_2: suggestion.tag_id_2,
          relationship_type: finalType,
          strength: finalStrength,
          status: 'active',
          source: 'user_suggested',
          curator_approved_by: user.id,
          curator_approved_at: now,
          curator_notes: notes || null,
          // Transfer community votes from suggestion
          agree_count: suggestion.agree_count,
          disagree_count: suggestion.disagree_count,
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating relationship:', createError)
        return NextResponse.json(
          { success: false, error: createError.message },
          { status: 500, headers: corsHeaders }
        )
      }

      createdRelationshipId = newRelationship.id

      // Update suggestion status
      await supabaseAdmin
        .from('tag_relationship_suggestions')
        .update({
          status: 'approved',
          resolved_by: user.id,
          resolved_at: now,
          resolution_notes: notes || null,
          created_relationship_id: createdRelationshipId,
        })
        .eq('id', suggestionId)

      // Migrate feedback votes from tag pair to the new relationship
      await supabaseAdmin
        .from('tag_relationship_feedback')
        .update({ tag_relationship_id: createdRelationshipId })
        .or(`and(tag_id_1.eq.${suggestion.tag_id_1},tag_id_2.eq.${suggestion.tag_id_2}),and(tag_id_1.eq.${suggestion.tag_id_2},tag_id_2.eq.${suggestion.tag_id_1})`)
        .is('tag_relationship_id', null)

    } else if (action === 'reject') {
      // Just update suggestion status
      await supabaseAdmin
        .from('tag_relationship_suggestions')
        .update({
          status: 'rejected',
          resolved_by: user.id,
          resolved_at: now,
          resolution_notes: notes || null,
        })
        .eq('id', suggestionId)
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          suggestionId,
          action,
          createdRelationshipId,
        },
      },
      { headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('Unexpected error in POST /api/tags/relationships/approve:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

/**
 * POST /api/tags/relationships/approve/batch
 *
 * Batch approve or reject multiple suggestions.
 *
 * Body:
 * {
 *   suggestionIds: string[],
 *   action: 'approve' | 'reject',
 *   notes?: string
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user (curator)
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
    const { suggestionIds, action, notes } = body

    if (!Array.isArray(suggestionIds) || suggestionIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'suggestionIds must be a non-empty array' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'action must be "approve" or "reject"' },
        { status: 400, headers: corsHeaders }
      )
    }

    const results: { id: string; success: boolean; error?: string; createdRelationshipId?: string }[] = []
    const now = new Date().toISOString()

    for (const suggestionId of suggestionIds) {
      try {
        // Get suggestion
        const { data: suggestion, error: suggestionError } = await supabaseAdmin
          .from('tag_relationship_suggestions')
          .select('*')
          .eq('id', suggestionId)
          .eq('status', 'pending')
          .single()

        if (suggestionError || !suggestion) {
          results.push({ id: suggestionId, success: false, error: 'Not found or not pending' })
          continue
        }

        if (action === 'approve') {
          // Check for existing relationship
          const { data: existing } = await supabaseAdmin
            .from('tag_relationships')
            .select('id')
            .or(`and(tag_id_1.eq.${suggestion.tag_id_1},tag_id_2.eq.${suggestion.tag_id_2}),and(tag_id_1.eq.${suggestion.tag_id_2},tag_id_2.eq.${suggestion.tag_id_1})`)
            .eq('relationship_type', suggestion.suggested_type)
            .maybeSingle()

          if (existing) {
            // Mark as merged
            await supabaseAdmin
              .from('tag_relationship_suggestions')
              .update({
                status: 'merged',
                resolved_by: user.id,
                resolved_at: now,
                resolution_notes: notes || 'Batch merged',
                created_relationship_id: existing.id,
              })
              .eq('id', suggestionId)

            results.push({ id: suggestionId, success: true, createdRelationshipId: existing.id })
            continue
          }

          // Create relationship
          const { data: newRel, error: createError } = await supabaseAdmin
            .from('tag_relationships')
            .insert({
              tag_id_1: suggestion.tag_id_1,
              tag_id_2: suggestion.tag_id_2,
              relationship_type: suggestion.suggested_type,
              strength: suggestion.suggested_strength,
              status: 'active',
              source: 'user_suggested',
              curator_approved_by: user.id,
              curator_approved_at: now,
              agree_count: suggestion.agree_count,
              disagree_count: suggestion.disagree_count,
            })
            .select()
            .single()

          if (createError) {
            results.push({ id: suggestionId, success: false, error: createError.message })
            continue
          }

          // Update suggestion
          await supabaseAdmin
            .from('tag_relationship_suggestions')
            .update({
              status: 'approved',
              resolved_by: user.id,
              resolved_at: now,
              resolution_notes: notes || 'Batch approved',
              created_relationship_id: newRel.id,
            })
            .eq('id', suggestionId)

          results.push({ id: suggestionId, success: true, createdRelationshipId: newRel.id })

        } else {
          // Reject
          await supabaseAdmin
            .from('tag_relationship_suggestions')
            .update({
              status: 'rejected',
              resolved_by: user.id,
              resolved_at: now,
              resolution_notes: notes || 'Batch rejected',
            })
            .eq('id', suggestionId)

          results.push({ id: suggestionId, success: true })
        }
      } catch (err: any) {
        results.push({ id: suggestionId, success: false, error: err.message })
      }
    }

    const successCount = results.filter(r => r.success).length

    return NextResponse.json(
      {
        success: true,
        data: {
          processed: results.length,
          succeeded: successCount,
          failed: results.length - successCount,
          results,
        },
      },
      { headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('Unexpected error in PUT /api/tags/relationships/approve:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
