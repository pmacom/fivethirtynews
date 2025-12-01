import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

async function getAuthenticatedUser(request: NextRequest, supabase: any) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('530_session')?.value;
  const authHeader = request.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
  const token = sessionToken || bearerToken;

  if (!token) return null;

  const { data: user } = await supabase
    .from('users')
    .select('id, is_admin, is_moderator')
    .eq('session_token', token)
    .single();

  return user;
}

async function canManageShow(userId: string, showId: string, supabase: any, isAdmin: boolean, isModerator: boolean) {
  if (isAdmin || isModerator) return true;

  const { data: member } = await supabase
    .from('show_members')
    .select('can_manage_show')
    .eq('show_id', showId)
    .eq('user_id', userId)
    .single();

  return member?.can_manage_show || false;
}

/**
 * POST /api/shows/[slug]/templates/reorder
 * Reorder category templates
 * Body: { template_ids: ["uuid1", "uuid2", ...] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug } = await params;

    const user = await getAuthenticatedUser(request, supabase);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get show by slug
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('id')
      .eq('slug', slug)
      .single();

    if (showError || !show) {
      return NextResponse.json(
        { success: false, error: 'Show not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Check permissions
    const hasPermission = await canManageShow(
      user.id,
      show.id,
      supabase,
      user.is_admin,
      user.is_moderator
    );

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { template_ids } = body;

    if (!template_ids || !Array.isArray(template_ids)) {
      return NextResponse.json(
        { success: false, error: 'template_ids array is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Update display_order for each template
    const updates = template_ids.map((templateId: string, index: number) =>
      supabase
        .from('show_category_templates')
        .update({ display_order: index })
        .eq('id', templateId)
        .eq('show_id', show.id)
    );

    await Promise.all(updates);

    return NextResponse.json(
      { success: true, message: 'Templates reordered successfully' },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('POST /api/shows/[slug]/templates/reorder error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
