import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

// Moderator Comments API
// GET /api/content/[id]/mod-comments - Get mod comments for content
// POST /api/content/[id]/mod-comments - Add a mod comment (moderator only)
// DELETE /api/content/[id]/mod-comments?comment_id=xxx - Delete comment (moderator only)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Helper to verify session and check moderator status
// Supports both cookie-based auth (for web app) and Bearer token (for extension/API)
async function verifyModeratorSession(request: NextRequest) {
  // Check Authorization header first (for extension/API clients)
  const authHeader = request.headers.get('Authorization');
  let sessionToken: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    sessionToken = authHeader.replace('Bearer ', '');
  }

  // Fall back to cookie-based auth (for web app)
  if (!sessionToken) {
    const cookieStore = await cookies();
    sessionToken = cookieStore.get('530_session')?.value || null;
  }

  if (!sessionToken) {
    return { user: null, error: 'Missing authorization' };
  }

  if (!sessionToken.startsWith('530_')) {
    return { user: null, error: 'Invalid token format' };
  }

  const supabase = await createClient();

  const { data: user, error } = await supabase
    .from('users')
    .select('id, display_name, discord_avatar, is_admin, is_moderator, session_expires_at')
    .eq('session_token', sessionToken)
    .single();

  if (error || !user) {
    return { user: null, error: 'Invalid session' };
  }

  if (user.session_expires_at && new Date(user.session_expires_at) < new Date()) {
    return { user: null, error: 'Session expired' };
  }

  if (!user.is_admin && !user.is_moderator) {
    return { user: null, error: 'Moderator access required' };
  }

  return { user, error: null };
}

// GET - Fetch moderator comments for a content item (public comments only for non-mods)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contentId } = await params;

  try {
    const supabase = await createClient();

    // Check if user is moderator to show private comments
    let showPrivate = false;
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const sessionToken = authHeader.replace('Bearer ', '');
      const { data: user } = await supabase
        .from('users')
        .select('is_admin, is_moderator')
        .eq('session_token', sessionToken)
        .single();
      showPrivate = !!(user?.is_admin || user?.is_moderator);
    }

    let query = supabase
      .from('moderator_comments')
      .select('*')
      .eq('content_id', contentId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: true });

    // Non-moderators only see public comments
    if (!showPrivate) {
      query = query.eq('is_public', true);
    }

    const { data: comments, error } = await query;

    if (error) {
      console.error('Error fetching mod comments:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch comments' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, data: comments || [] },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('GET mod comments error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST - Add a moderator comment (moderator only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contentId } = await params;

  const { user, error: authError } = await verifyModeratorSession(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: authError },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const body = await request.json();
    const { comment_text, comment_type, is_pinned, is_public } = body;

    // Validate comment text
    if (!comment_text || typeof comment_text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'comment_text is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const trimmedText = comment_text.trim();

    if (trimmedText.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Comment cannot be empty' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (trimmedText.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Comment exceeds 2000 character limit' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate comment type
    const validTypes = ['note', 'context', 'warning', 'highlight', 'question'];
    const type = comment_type || 'note';
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: `Invalid comment_type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = await createClient();

    // Verify content exists
    const { data: content, error: contentError } = await supabase
      .from('content')
      .select('id')
      .eq('id', contentId)
      .single();

    if (contentError || !content) {
      return NextResponse.json(
        { success: false, error: 'Content not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Determine author role
    const authorRole = user.is_admin ? 'admin' : 'moderator';

    // Create comment
    const { data: comment, error: insertError } = await supabase
      .from('moderator_comments')
      .insert({
        content_id: contentId,
        user_id: user.id,
        comment_text: trimmedText,
        comment_type: type,
        is_pinned: is_pinned ?? false,
        is_public: is_public ?? true,
        author_name: user.display_name,
        author_avatar: user.discord_avatar,
        author_role: authorRole,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating mod comment:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create comment' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, data: comment },
      { status: 201, headers: corsHeaders }
    );
  } catch (err) {
    console.error('POST mod comment error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE - Delete a moderator comment (moderator only, own comments or admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contentId } = await params;

  const { user, error: authError } = await verifyModeratorSession(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: authError },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const commentId = request.nextUrl.searchParams.get('comment_id');

    if (!commentId) {
      return NextResponse.json(
        { success: false, error: 'comment_id query parameter is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = await createClient();

    // Fetch comment to check ownership
    const { data: comment, error: fetchError } = await supabase
      .from('moderator_comments')
      .select('user_id')
      .eq('id', commentId)
      .eq('content_id', contentId)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Only allow deletion if user owns comment or is admin
    if (comment.user_id !== user.id && !user.is_admin) {
      return NextResponse.json(
        { success: false, error: 'Can only delete your own comments' },
        { status: 403, headers: corsHeaders }
      );
    }

    const { error: deleteError } = await supabase
      .from('moderator_comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) {
      console.error('Error deleting mod comment:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete comment' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Comment deleted' },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('DELETE mod comment error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
