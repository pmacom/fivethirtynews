import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/comments?contentId=...
 * Fetch all comments for a specific content item
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const contentId = searchParams.get('contentId')

    if (!contentId) {
      return NextResponse.json(
        { success: false, error: 'contentId is required' },
        { status: 400 }
      )
    }

    // Fetch comments sorted by likes (most popular first)
    const { data, error } = await supabase
      .from('content_comments')
      .select('*')
      .eq('content_id', contentId)
      .order('likes_count', { ascending: false })
      .order('saved_at', { ascending: false })

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    })
  } catch (error: any) {
    console.error('Unexpected error in GET /api/comments:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/comments
 * Save a new comment attached to content
 *
 * Body: {
 *   contentId: string,
 *   comment: {
 *     platform: string,
 *     platformCommentId: string,
 *     commentText: string,
 *     commentUrl?: string,
 *     authorName?: string,
 *     authorUsername?: string,
 *     authorAvatarUrl?: string,
 *     authorUrl?: string,
 *     likesCount?: number,
 *     repliesCount?: number,
 *     isAuthorVerified?: boolean,
 *     commentCreatedAt?: string,
 *     metadata?: object
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contentId, comment } = body

    if (!contentId || !comment) {
      return NextResponse.json(
        { success: false, error: 'contentId and comment are required' },
        { status: 400 }
      )
    }

    // Validate required comment fields
    if (!comment.platform || !comment.platformCommentId || !comment.commentText) {
      return NextResponse.json(
        { success: false, error: 'comment must include platform, platformCommentId, and commentText' },
        { status: 400 }
      )
    }

    // Generate deterministic comment ID
    const commentId = `${comment.platform}:${comment.platformCommentId}`

    // Check if comment already exists
    const { data: existing } = await supabase
      .from('content_comments')
      .select('id')
      .eq('id', commentId)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Comment already saved', data: existing },
        { status: 409 }
      )
    }

    // Insert new comment
    const { data, error } = await supabase
      .from('content_comments')
      .insert({
        id: commentId,
        content_id: contentId,
        platform: comment.platform,
        platform_comment_id: comment.platformCommentId,
        comment_text: comment.commentText,
        comment_url: comment.commentUrl || null,
        author_name: comment.authorName || null,
        author_username: comment.authorUsername || null,
        author_avatar_url: comment.authorAvatarUrl || null,
        author_url: comment.authorUrl || null,
        likes_count: comment.likesCount || 0,
        replies_count: comment.repliesCount || 0,
        is_author_verified: comment.isAuthorVerified || false,
        comment_created_at: comment.commentCreatedAt || null,
        metadata: comment.metadata || {}
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving comment:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Comment saved successfully'
    })
  } catch (error: any) {
    console.error('Unexpected error in POST /api/comments:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/comments?id=...
 * Delete a saved comment
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('content_comments')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting comment:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully'
    })
  } catch (error: any) {
    console.error('Unexpected error in DELETE /api/comments:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
