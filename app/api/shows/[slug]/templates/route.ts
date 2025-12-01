import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
 * GET /api/shows/[slug]/templates
 * List all category templates for a show
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug } = await params;

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

    // Fetch templates with their tags
    const { data: templates, error: templatesError } = await supabase
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
      .eq('show_id', show.id)
      .order('display_order')
      .order('created_at');

    if (templatesError) {
      console.error('Error fetching templates:', templatesError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch templates' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Transform to include tags as a flat array
    const transformedTemplates = templates?.map(template => ({
      ...template,
      tags: template.show_category_template_tags
        ?.sort((a: any, b: any) => a.display_order - b.display_order)
        .map((t: any) => t.tag_slug) || []
    }));

    return NextResponse.json(
      { success: true, data: transformedTemplates },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('GET /api/shows/[slug]/templates error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/shows/[slug]/templates
 * Create a new category template
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
    const { name, slug: templateSlug, description, icon, display_order, tags } = body;

    if (!name || !templateSlug) {
      return NextResponse.json(
        { success: false, error: 'name and slug are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate slug format (lowercase, alphanumeric, hyphens only)
    if (!/^[a-z0-9-]+$/.test(templateSlug)) {
      return NextResponse.json(
        { success: false, error: 'slug must be lowercase alphanumeric with hyphens only' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get max display_order for positioning
    const { data: maxOrderResult } = await supabase
      .from('show_category_templates')
      .select('display_order')
      .eq('show_id', show.id)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = display_order ?? ((maxOrderResult?.display_order ?? -1) + 1);

    // Create the template
    const { data: newTemplate, error: insertError } = await supabase
      .from('show_category_templates')
      .insert({
        show_id: show.id,
        name,
        slug: templateSlug,
        description,
        icon,
        display_order: nextOrder,
        created_by: user.id,
      })
      .select('id, name, slug, description, icon, display_order, is_active, created_at')
      .single();

    if (insertError) {
      console.error('Error creating template:', insertError);
      if (insertError.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'A template with this slug already exists' },
          { status: 409, headers: corsHeaders }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Failed to create template' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Add tags if provided
    if (tags && Array.isArray(tags) && tags.length > 0) {
      const tagInserts = tags.map((tag_slug: string, index: number) => ({
        template_id: newTemplate.id,
        tag_slug,
        display_order: index,
      }));

      const { error: tagsError } = await supabase
        .from('show_category_template_tags')
        .insert(tagInserts);

      if (tagsError) {
        console.error('Error adding template tags:', tagsError);
        // Template was created, just log the tag error
      }
    }

    // Fetch the complete template with tags
    const { data: completeTemplate } = await supabase
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
      .eq('id', newTemplate.id)
      .single();

    const responseTemplate = {
      ...completeTemplate,
      tags: completeTemplate?.show_category_template_tags
        ?.sort((a: any, b: any) => a.display_order - b.display_order)
        .map((t: any) => t.tag_slug) || []
    };

    return NextResponse.json(
      { success: true, data: responseTemplate },
      { status: 201, headers: corsHeaders }
    );
  } catch (err) {
    console.error('POST /api/shows/[slug]/templates error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
