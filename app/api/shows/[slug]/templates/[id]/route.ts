import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
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
    .select('id, is_admin, is_moderator, display_name')
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
 * GET /api/shows/[slug]/templates/[id]
 * Get a single template with its tags
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug, id } = await params;

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

    // Fetch template with tags
    const { data: template, error: templateError } = await supabase
      .from('show_category_templates')
      .select(`
        id,
        name,
        slug,
        description,
        icon,
        display_order,
        is_active,
        created_at,
        updated_at,
        show_category_template_tags (
          id,
          tag_slug,
          display_order
        )
      `)
      .eq('id', id)
      .eq('show_id', show.id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const responseTemplate = {
      ...template,
      tags: template.show_category_template_tags
        ?.sort((a: any, b: any) => a.display_order - b.display_order)
        .map((t: any) => t.tag_slug) || []
    };

    return NextResponse.json(
      { success: true, data: responseTemplate },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('GET /api/shows/[slug]/templates/[id] error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PUT /api/shows/[slug]/templates/[id]
 * Update a category template
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug, id } = await params;

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

    // Verify template exists and belongs to this show
    const { data: existingTemplate, error: templateCheckError } = await supabase
      .from('show_category_templates')
      .select('id')
      .eq('id', id)
      .eq('show_id', show.id)
      .single();

    if (templateCheckError || !existingTemplate) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { name, slug: templateSlug, description, icon, display_order, is_active, tags } = body;

    // Validate slug format if provided
    if (templateSlug && !/^[a-z0-9-]+$/.test(templateSlug)) {
      return NextResponse.json(
        { success: false, error: 'slug must be lowercase alphanumeric with hyphens only' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Build update object
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (templateSlug !== undefined) updateData.slug = templateSlug;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (display_order !== undefined) updateData.display_order = display_order;
    if (is_active !== undefined) updateData.is_active = is_active;

    // Update template
    const { error: updateError } = await supabase
      .from('show_category_templates')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('Error updating template:', updateError);
      if (updateError.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'A template with this slug already exists' },
          { status: 409, headers: corsHeaders }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Failed to update template' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Update tags if provided
    if (tags !== undefined && Array.isArray(tags)) {
      // Delete existing tags
      await supabase
        .from('show_category_template_tags')
        .delete()
        .eq('template_id', id);

      // Insert new tags
      if (tags.length > 0) {
        const tagInserts = tags.map((tag_slug: string, index: number) => ({
          template_id: id,
          tag_slug,
          display_order: index,
        }));

        const { error: tagsError } = await supabase
          .from('show_category_template_tags')
          .insert(tagInserts);

        if (tagsError) {
          console.error('Error updating template tags:', tagsError);
        }
      }
    }

    // Fetch updated template
    const { data: updatedTemplate } = await supabase
      .from('show_category_templates')
      .select(`
        id,
        name,
        slug,
        description,
        icon,
        display_order,
        is_active,
        created_at,
        updated_at,
        show_category_template_tags (
          id,
          tag_slug,
          display_order
        )
      `)
      .eq('id', id)
      .single();

    const responseTemplate = {
      ...updatedTemplate,
      tags: updatedTemplate?.show_category_template_tags
        ?.sort((a: any, b: any) => a.display_order - b.display_order)
        .map((t: any) => t.tag_slug) || []
    };

    return NextResponse.json(
      { success: true, data: responseTemplate },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('PUT /api/shows/[slug]/templates/[id] error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/shows/[slug]/templates/[id]
 * Delete a category template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug, id } = await params;

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

    // Delete template (cascade will handle tags)
    const { error: deleteError } = await supabase
      .from('show_category_templates')
      .delete()
      .eq('id', id)
      .eq('show_id', show.id);

    if (deleteError) {
      console.error('Error deleting template:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete template' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Template deleted successfully' },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('DELETE /api/shows/[slug]/templates/[id] error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
