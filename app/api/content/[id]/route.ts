import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

import { cookies } from 'next/headers';

// CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * OPTIONS /api/content/[id]
 * Handle preflight requests
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/content/[id]
 * Get a single content item by ID (returns tags, channels, and all metadata)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Content ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = await createClient();

    console.log('[API /content/[id]] Fetching content with ID:', id);

    // Fetch content by ID - includes tags array
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('id', id)
      .single();

    console.log('[API /content/[id]] Result:', { found: !!data, error: error?.message, tags: data?.tags });

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Content not found' },
          { status: 404, headers: corsHeaders }
        );
      }
      console.error('Error fetching content:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch content' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PATCH /api/content/[id]
 * Update content tags (requires admin/moderator auth)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Content ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check authentication
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('530_session')?.value;
    const authHeader = request.headers.get('Authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
    const token = sessionToken || bearerToken;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = await createClient();

    // Verify user is admin or moderator
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, is_admin, is_moderator')
      .eq('session_token', token)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401, headers: corsHeaders }
      );
    }

    if (!user.is_admin && !user.is_moderator) {
      return NextResponse.json(
        { success: false, error: 'Admin or moderator access required' },
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { tags, channels, primaryChannel } = body;

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Update tags if provided
    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        return NextResponse.json(
          { success: false, error: 'Tags must be an array' },
          { status: 400, headers: corsHeaders }
        );
      }
      updateData.tags = tags;
    }

    // Update channels if provided
    if (channels !== undefined) {
      if (!Array.isArray(channels)) {
        return NextResponse.json(
          { success: false, error: 'Channels must be an array' },
          { status: 400, headers: corsHeaders }
        );
      }
      updateData.channels = channels;
    }

    // Update primary_channel if provided
    if (primaryChannel !== undefined) {
      updateData.primary_channel = primaryChannel;
    }

    // Update content
    const { data, error } = await supabase
      .from('content')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Content not found' },
          { status: 404, headers: corsHeaders }
        );
      }
      console.error('Error updating content:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update content' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
