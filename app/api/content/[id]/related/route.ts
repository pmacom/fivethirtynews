import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

/**
 * GET /api/content/[id]/related
 *
 * Get content related to a specific content item, ordered by relationship strength.
 *
 * Query params:
 *   - limit: Max results (default 20, max 50)
 *   - min_strength: Minimum relationship strength (default 0.1)
 *   - include_content: If true, include full content data (default false)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contentId } = await params
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams

    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)
    const minStrength = parseFloat(searchParams.get('min_strength') || '0.1')
    const includeContent = searchParams.get('include_content') === 'true'

    // Validate content ID exists
    const { data: contentExists, error: contentError } = await supabase
      .from('content')
      .select('id')
      .eq('id', contentId)
      .single()

    if (contentError || !contentExists) {
      return NextResponse.json(
        { success: false, error: 'Content not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Get related content using the database function
    const { data: relatedIds, error: relatedError } = await supabase.rpc('get_related_content', {
      p_content_id: contentId,
      p_min_strength: minStrength,
      p_limit: limit,
    })

    if (relatedError) {
      console.error('[Related Content] Error fetching related:', relatedError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch related content' },
        { status: 500, headers: corsHeaders }
      )
    }

    // If no related content found
    if (!relatedIds || relatedIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        contentId,
      }, { headers: corsHeaders })
    }

    // If includeContent, fetch full content data
    let result = relatedIds
    if (includeContent) {
      const contentIds = relatedIds.map((r: { content_id: string }) => r.content_id)

      const { data: contents, error: contentsError } = await supabase
        .from('content')
        .select(`
          id,
          platform,
          platform_content_id,
          url,
          title,
          description,
          author_name,
          author_username,
          author_avatar_url,
          thumbnail_url,
          tags,
          channels,
          primary_channel,
          content_created_at,
          created_at
        `)
        .in('id', contentIds)

      if (contentsError) {
        console.error('[Related Content] Error fetching content data:', contentsError)
        // Fall back to just IDs
      } else {
        // Merge content data with relationship scores
        const contentMap = new Map(contents?.map(c => [c.id, c]) || [])
        result = relatedIds.map((r: { content_id: string; total_strength: number; navigation_strength: number; search_strength: number; explicit_strength: number; signal_count: number; last_seen: string }) => ({
          ...r,
          content: contentMap.get(r.content_id) || null,
        }))
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      contentId,
      query: {
        limit,
        minStrength,
        includeContent,
      },
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('[Related Content] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
