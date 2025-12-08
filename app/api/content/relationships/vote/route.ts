import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/content/relationships/vote
 *
 * Vote on a content relationship (agree/disagree).
 *
 * Body:
 * {
 *   contentId1: string,  // First content UUID (will be normalized)
 *   contentId2: string,  // Second content UUID
 *   vote: 'agree' | 'disagree',
 *   reason?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { contentId1, contentId2, vote, reason } = body

    // Validate inputs
    if (!contentId1 || !contentId2) {
      return NextResponse.json(
        { success: false, error: 'contentId1 and contentId2 are required' },
        { status: 400 }
      )
    }

    if (!['agree', 'disagree'].includes(vote)) {
      return NextResponse.json(
        { success: false, error: 'vote must be "agree" or "disagree"' },
        { status: 400 }
      )
    }

    if (contentId1 === contentId2) {
      return NextResponse.json(
        { success: false, error: 'Cannot vote on self-relationship' },
        { status: 400 }
      )
    }

    // Normalize content IDs (smaller first, matching content_relationships table)
    const normalizedId1 = contentId1 < contentId2 ? contentId1 : contentId2
    const normalizedId2 = contentId1 < contentId2 ? contentId2 : contentId1

    // Get or create user in users table
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Upsert vote
    const { data, error } = await supabase
      .from('content_relationship_feedback')
      .upsert({
        content_id_1: normalizedId1,
        content_id_2: normalizedId2,
        user_id: userData.id,
        vote,
        reason: reason || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'content_id_1,content_id_2,user_id',
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving vote:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        vote: data.vote,
      }
    })
  } catch (error: any) {
    console.error('Error in content vote API:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/content/relationships/vote
 *
 * Get user's vote on a content relationship.
 *
 * Query params:
 * - contentId1: First content UUID
 * - contentId2: Second content UUID
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const contentId1 = searchParams.get('contentId1')
    const contentId2 = searchParams.get('contentId2')

    if (!contentId1 || !contentId2) {
      return NextResponse.json(
        { success: false, error: 'contentId1 and contentId2 are required' },
        { status: 400 }
      )
    }

    // Normalize IDs
    const normalizedId1 = contentId1 < contentId2 ? contentId1 : contentId2
    const normalizedId2 = contentId1 < contentId2 ? contentId2 : contentId1

    // Get user ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ success: true, data: null })
    }

    // Get vote
    const { data, error } = await supabase
      .from('content_relationship_feedback')
      .select('vote, reason, created_at')
      .eq('content_id_1', normalizedId1)
      .eq('content_id_2', normalizedId2)
      .eq('user_id', userData.id)
      .maybeSingle()

    if (error) {
      console.error('Error fetching vote:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data ? {
        vote: data.vote,
        reason: data.reason,
        createdAt: data.created_at,
      } : null
    })
  } catch (error: any) {
    console.error('Error in content vote GET:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/content/relationships/vote
 *
 * Remove user's vote on a content relationship.
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const contentId1 = searchParams.get('contentId1')
    const contentId2 = searchParams.get('contentId2')

    if (!contentId1 || !contentId2) {
      return NextResponse.json(
        { success: false, error: 'contentId1 and contentId2 are required' },
        { status: 400 }
      )
    }

    // Normalize IDs
    const normalizedId1 = contentId1 < contentId2 ? contentId1 : contentId2
    const normalizedId2 = contentId1 < contentId2 ? contentId2 : contentId1

    // Get user ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ success: true, data: { deleted: false } })
    }

    // Delete vote
    const { error } = await supabase
      .from('content_relationship_feedback')
      .delete()
      .eq('content_id_1', normalizedId1)
      .eq('content_id_2', normalizedId2)
      .eq('user_id', userData.id)

    if (error) {
      console.error('Error deleting vote:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true }
    })
  } catch (error: any) {
    console.error('Error in content vote DELETE:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
