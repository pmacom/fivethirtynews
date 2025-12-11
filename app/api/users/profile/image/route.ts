import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/users/profile/image
 * Upload profile background image
 * Body: FormData with 'image' file
 * Requires authentication
 */
export async function POST(request: NextRequest) {
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
      .select('id, background_image_url')
      .eq('session_token', token)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No image file provided' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Allowed: JPEG, PNG, WebP' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size: 2MB' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate file path
    const ext = file.type.split('/')[1];
    const filePath = `${currentUser.id}/background.${ext}`;

    // Delete existing image if present
    if (currentUser.background_image_url) {
      const oldPath = currentUser.background_image_url.split('/profile-images/')[1];
      if (oldPath) {
        await supabase.storage.from('profile-images').remove([oldPath]);
      }
    }

    // Upload new image
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Failed to upload image' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Update user record
    const { error: updateError } = await supabase
      .from('users')
      .update({ background_image_url: publicUrl })
      .eq('id', currentUser.id);

    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update profile' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, data: { background_image_url: publicUrl } },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('POST /api/users/profile/image error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/users/profile/image
 * Remove profile background image
 * Requires authentication
 */
export async function DELETE(request: NextRequest) {
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
      .select('id, background_image_url')
      .eq('session_token', token)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Delete image from storage if exists
    if (currentUser.background_image_url) {
      const filePath = currentUser.background_image_url.split('/profile-images/')[1];
      if (filePath) {
        const { error: deleteError } = await supabase.storage
          .from('profile-images')
          .remove([filePath]);

        if (deleteError) {
          console.error('Error deleting image:', deleteError);
          // Continue anyway - file might not exist
        }
      }
    }

    // Clear URL in user record
    const { error: updateError } = await supabase
      .from('users')
      .update({ background_image_url: null })
      .eq('id', currentUser.id);

    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update profile' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('DELETE /api/users/profile/image error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
