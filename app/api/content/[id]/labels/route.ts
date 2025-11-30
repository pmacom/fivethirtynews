import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Content Labels API
// GET /api/content/[id]/labels - Get labels assigned to content
// POST /api/content/[id]/labels - Assign label to content (moderator only)
// DELETE /api/content/[id]/labels?label_id=xxx - Remove label (moderator only)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Helper to verify session and check moderator status
async function verifyModeratorSession(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Missing authorization' };
  }

  const sessionToken = authHeader.replace('Bearer ', '');

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

// GET - Fetch labels for a content item (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contentId } = await params;

  try {
    const supabase = await createClient();

    // Fetch label assignments with label details
    const { data: assignments, error } = await supabase
      .from('content_label_assignments')
      .select(`
        id,
        assigned_at,
        note,
        label:content_labels (
          id,
          slug,
          name,
          color,
          text_color,
          icon,
          category
        ),
        assigned_by_user:users!assigned_by (
          id,
          display_name,
          discord_avatar
        )
      `)
      .eq('content_id', contentId)
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('Error fetching content labels:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch labels' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Transform to flatten label data
    const labels = (assignments || []).map((a) => ({
      assignment_id: a.id,
      ...a.label,
      assigned_at: a.assigned_at,
      assigned_by: a.assigned_by_user,
      note: a.note,
    }));

    return NextResponse.json(
      { success: true, data: labels },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('GET content labels error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST - Assign a label to content (moderator only)
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
    const { label_id, note } = body;

    if (!label_id) {
      return NextResponse.json(
        { success: false, error: 'label_id is required' },
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

    // Verify label exists
    const { data: label, error: labelError } = await supabase
      .from('content_labels')
      .select('id, name')
      .eq('id', label_id)
      .eq('is_active', true)
      .single();

    if (labelError || !label) {
      return NextResponse.json(
        { success: false, error: 'Label not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Create assignment
    const { data: assignment, error: assignError } = await supabase
      .from('content_label_assignments')
      .insert({
        content_id: contentId,
        label_id,
        assigned_by: user.id,
        note: note || null,
      })
      .select()
      .single();

    if (assignError) {
      if (assignError.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'Label already assigned to this content' },
          { status: 409, headers: corsHeaders }
        );
      }
      console.error('Error assigning label:', assignError);
      return NextResponse.json(
        { success: false, error: 'Failed to assign label' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, data: assignment },
      { status: 201, headers: corsHeaders }
    );
  } catch (err) {
    console.error('POST content label error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE - Remove a label from content (moderator only)
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
    const labelId = request.nextUrl.searchParams.get('label_id');

    if (!labelId) {
      return NextResponse.json(
        { success: false, error: 'label_id query parameter is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = await createClient();

    const { error: deleteError } = await supabase
      .from('content_label_assignments')
      .delete()
      .eq('content_id', contentId)
      .eq('label_id', labelId);

    if (deleteError) {
      console.error('Error removing label:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to remove label' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Label removed' },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('DELETE content label error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
