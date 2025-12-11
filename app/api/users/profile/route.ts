import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

interface ProfileLink {
  label: string;
  url: string;
}

/**
 * GET /api/users/profile
 * Get current user's profile
 * Requires authentication
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    // Get current user with profile fields
    const { data: user, error } = await supabase
      .from('users')
      .select('id, display_name, discord_avatar, bio, background_image_url, profile_links, is_admin, is_moderator')
      .eq('session_token', token)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, data: user },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('GET /api/users/profile error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PATCH /api/users/profile
 * Update current user's profile
 * Body: { bio?: string, profile_links?: {label: string, url: string}[] }
 * Requires authentication
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    // Get current user
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('session_token', token)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const { bio, profile_links } = body;

    // Validate bio
    if (bio !== undefined) {
      if (typeof bio !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Bio must be a string' },
          { status: 400, headers: corsHeaders }
        );
      }
      if (bio.length > 200) {
        return NextResponse.json(
          { success: false, error: 'Bio must be 200 characters or less' },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Validate profile_links
    if (profile_links !== undefined) {
      if (!Array.isArray(profile_links)) {
        return NextResponse.json(
          { success: false, error: 'Profile links must be an array' },
          { status: 400, headers: corsHeaders }
        );
      }
      if (profile_links.length > 4) {
        return NextResponse.json(
          { success: false, error: 'Maximum 4 profile links allowed' },
          { status: 400, headers: corsHeaders }
        );
      }

      // Validate each link
      for (const link of profile_links as ProfileLink[]) {
        if (!link.label || typeof link.label !== 'string') {
          return NextResponse.json(
            { success: false, error: 'Each link must have a label' },
            { status: 400, headers: corsHeaders }
          );
        }
        if (link.label.length > 50) {
          return NextResponse.json(
            { success: false, error: 'Link labels must be 50 characters or less' },
            { status: 400, headers: corsHeaders }
          );
        }
        if (!link.url || typeof link.url !== 'string') {
          return NextResponse.json(
            { success: false, error: 'Each link must have a URL' },
            { status: 400, headers: corsHeaders }
          );
        }
        // Basic URL validation
        try {
          new URL(link.url);
        } catch {
          return NextResponse.json(
            { success: false, error: `Invalid URL: ${link.url}` },
            { status: 400, headers: corsHeaders }
          );
        }
      }
    }

    // Build update object
    const updateData: { bio?: string | null; profile_links?: ProfileLink[] } = {};
    if (bio !== undefined) {
      updateData.bio = bio || null;
    }
    if (profile_links !== undefined) {
      updateData.profile_links = profile_links;
    }

    // Update user profile
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', currentUser.id)
      .select('id, display_name, discord_avatar, bio, background_image_url, profile_links, is_admin, is_moderator')
      .single();

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update profile' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, data: updatedUser },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('PATCH /api/users/profile error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
