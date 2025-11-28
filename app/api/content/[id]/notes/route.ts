import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Notes CRUD API
// GET /api/content/[id]/notes - Get all notes for content
// POST /api/content/[id]/notes - Create/update my note
// DELETE /api/content/[id]/notes - Delete my note

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Helper to verify session and get user
async function verifySession(request: NextRequest) {
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
    .select('id, display_name, discord_avatar, session_expires_at, is_guild_member')
    .eq('session_token', sessionToken)
    .single();

  if (error || !user) {
    return { user: null, error: 'Invalid session' };
  }

  if (user.session_expires_at && new Date(user.session_expires_at) < new Date()) {
    return { user: null, error: 'Session expired' };
  }

  if (!user.is_guild_member) {
    return { user: null, error: 'Not a guild member' };
  }

  return { user, error: null };
}

// GET - Fetch all notes for a content item
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: contentId } = await params;

  // Auth is required to view notes
  const { user, error: authError } = await verifySession(request);
  if (!user) {
    return NextResponse.json({ success: false, error: authError }, { status: 401, headers: corsHeaders });
  }

  try {
    const supabase = await createClient();

    // Verify content exists
    const { data: content, error: contentError } = await supabase
      .from('content')
      .select('id')
      .eq('id', contentId)
      .single();

    if (contentError || !content) {
      return NextResponse.json({ success: false, error: 'Content not found' }, { status: 404, headers: corsHeaders });
    }

    // Fetch all notes for this content with user info
    const { data: notes, error: notesError } = await supabase
      .from('content_notes')
      .select(
        `
        id,
        note_text,
        author_name,
        user_id,
        created_at,
        updated_at,
        user:users (
          id,
          display_name,
          discord_avatar
        )
      `
      )
      .eq('content_id', contentId)
      .order('created_at', { ascending: false });

    if (notesError) {
      console.error('Error fetching notes:', notesError);
      return NextResponse.json({ success: false, error: 'Failed to fetch notes' }, { status: 500, headers: corsHeaders });
    }

    // Find current user's note
    const myNote = notes?.find((note) => note.user_id === user.id) || null;

    return NextResponse.json(
      {
        success: true,
        data: notes || [],
        count: notes?.length || 0,
        my_note: myNote,
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('GET notes error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500, headers: corsHeaders });
  }
}

// POST - Create or update my note (upsert)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: contentId } = await params;

  // Auth required
  const { user, error: authError } = await verifySession(request);
  if (!user) {
    return NextResponse.json({ success: false, error: authError }, { status: 401, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { note_text } = body;

    // Validate note text
    if (!note_text || typeof note_text !== 'string') {
      return NextResponse.json({ success: false, error: 'note_text is required' }, { status: 400, headers: corsHeaders });
    }

    const trimmedText = note_text.trim();

    if (trimmedText.length === 0) {
      return NextResponse.json({ success: false, error: 'Note cannot be empty' }, { status: 400, headers: corsHeaders });
    }

    if (trimmedText.length > 280) {
      return NextResponse.json(
        { success: false, error: 'Note exceeds 280 character limit' },
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
      return NextResponse.json({ success: false, error: 'Content not found' }, { status: 404, headers: corsHeaders });
    }

    // Check if user already has a note for this content
    const { data: existingNote } = await supabase
      .from('content_notes')
      .select('id')
      .eq('content_id', contentId)
      .eq('user_id', user.id)
      .single();

    if (existingNote) {
      // Update existing note
      const { data: updatedNote, error: updateError } = await supabase
        .from('content_notes')
        .update({
          note_text: trimmedText,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingNote.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating note:', updateError);
        return NextResponse.json({ success: false, error: 'Failed to update note' }, { status: 500, headers: corsHeaders });
      }

      return NextResponse.json({ success: true, data: updatedNote, action: 'updated' }, { headers: corsHeaders });
    } else {
      // Create new note
      const { data: newNote, error: insertError } = await supabase
        .from('content_notes')
        .insert({
          content_id: contentId,
          user_id: user.id,
          note_text: trimmedText,
          author_name: user.display_name,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating note:', insertError);
        return NextResponse.json({ success: false, error: 'Failed to create note' }, { status: 500, headers: corsHeaders });
      }

      return NextResponse.json({ success: true, data: newNote, action: 'created' }, { headers: corsHeaders });
    }
  } catch (err) {
    console.error('POST note error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500, headers: corsHeaders });
  }
}

// DELETE - Delete my note
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: contentId } = await params;

  // Auth required
  const { user, error: authError } = await verifySession(request);
  if (!user) {
    return NextResponse.json({ success: false, error: authError }, { status: 401, headers: corsHeaders });
  }

  try {
    const supabase = await createClient();

    // Delete user's note for this content
    const { error: deleteError } = await supabase
      .from('content_notes')
      .delete()
      .eq('content_id', contentId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting note:', deleteError);
      return NextResponse.json({ success: false, error: 'Failed to delete note' }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, message: 'Note deleted' }, { headers: corsHeaders });
  } catch (err) {
    console.error('DELETE note error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
