import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Labels API
// GET /api/labels - Get all available labels
// POST /api/labels - Create a new label (moderator only)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    .select('id, display_name, is_admin, is_moderator, session_expires_at')
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

// GET - Fetch all active labels
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: labels, error } = await supabase
      .from('content_labels')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching labels:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch labels' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, data: labels || [] },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('GET labels error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST - Create a new label (moderator only)
export async function POST(request: NextRequest) {
  const { user, error: authError } = await verifyModeratorSession(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: authError },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const body = await request.json();
    const { slug, name, description, color, text_color, icon, category } = body;

    // Validate required fields
    if (!slug || !name) {
      return NextResponse.json(
        { success: false, error: 'slug and name are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate slug format (lowercase, alphanumeric with hyphens)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { success: false, error: 'slug must be lowercase alphanumeric with hyphens only' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = await createClient();

    const { data: label, error } = await supabase
      .from('content_labels')
      .insert({
        slug,
        name,
        description: description || null,
        color: color || '#6366f1',
        text_color: text_color || '#ffffff',
        icon: icon || null,
        category: category || 'custom',
        is_system: false,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'Label with this slug already exists' },
          { status: 409, headers: corsHeaders }
        );
      }
      console.error('Error creating label:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create label' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, data: label },
      { status: 201, headers: corsHeaders }
    );
  } catch (err) {
    console.error('POST label error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
