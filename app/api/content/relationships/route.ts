import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

/**
 * POST /api/content/relationships
 *
 * Record a relationship signal between two content items.
 * This is called when users navigate between content, search and select, or explicitly link.
 *
 * Body:
 *   - contentIdA: UUID of source content
 *   - contentIdB: UUID of target content
 *   - signalType: 'navigation' | 'search' | 'explicit'
 *   - weight?: number (0-1, default 1.0)
 *   - context?: object (optional metadata like search query)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { contentIdA, contentIdB, signalType, weight = 1.0, context = {} } = body

    // Validate required fields
    if (!contentIdA || !contentIdB) {
      return NextResponse.json(
        { success: false, error: 'contentIdA and contentIdB are required' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!['navigation', 'search', 'explicit'].includes(signalType)) {
      return NextResponse.json(
        { success: false, error: 'signalType must be navigation, search, or explicit' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Prevent self-reference
    if (contentIdA === contentIdB) {
      return NextResponse.json(
        { success: false, error: 'Cannot create relationship between same content' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get current user (optional - relationships can be anonymous)
    const { data: { user } } = await supabase.auth.getUser()

    // Call the database function to record the signal
    const { data, error } = await supabase.rpc('record_content_signal', {
      p_source_id: contentIdA,
      p_target_id: contentIdB,
      p_signal_type: signalType,
      p_weight: Math.min(1.0, Math.max(0.0, weight)),
      p_context: context,
      p_user_id: user?.id || null,
    })

    if (error) {
      console.error('[Content Relationships] Error recording signal:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to record relationship', details: error.message },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json({
      success: true,
      signalId: data,
      message: `Recorded ${signalType} signal between content`,
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('[Content Relationships] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

/**
 * GET /api/content/relationships
 *
 * Get relationship statistics (for debugging/admin)
 *
 * Query params:
 *   - limit: number of top relationships to return (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

    const { data, error, count } = await supabase
      .from('content_relationships')
      .select('*', { count: 'exact' })
      .order('total_strength', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[Content Relationships] Error fetching relationships:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch relationships' },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      total: count,
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('[Content Relationships] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
