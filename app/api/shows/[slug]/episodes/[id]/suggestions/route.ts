import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

async function canCreateEpisodes(userId: string, showId: string, supabase: any, isAdmin: boolean, isModerator: boolean) {
  if (isAdmin || isModerator) return true;

  const { data: member } = await supabase
    .from('show_members')
    .select('can_create_episodes')
    .eq('show_id', showId)
    .eq('user_id', userId)
    .single();

  return member?.can_create_episodes || false;
}

/**
 * GET /api/shows/[slug]/episodes/[id]/suggestions
 * Get content suggestions for each category template
 * Returns content that matches template tags since the last episode
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug, id: episodeId } = await params;

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
      .select('id, created_at')
      .eq('slug', slug)
      .single();

    if (showError || !show) {
      return NextResponse.json(
        { success: false, error: 'Show not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Check permissions
    const hasPermission = await canCreateEpisodes(
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

    // Verify episode exists and belongs to this show
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('id, scheduled_at')
      .eq('id', episodeId)
      .eq('show_id', show.id)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json(
        { success: false, error: 'Episode not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Get last completed episode date (before this one)
    const { data: lastEpisode } = await supabase
      .from('episodes')
      .select('scheduled_at')
      .eq('show_id', show.id)
      .eq('status', 'completed')
      .lt('scheduled_at', episode.scheduled_at || new Date().toISOString())
      .order('scheduled_at', { ascending: false })
      .limit(1)
      .single();

    const sinceDate = lastEpisode?.scheduled_at || show.created_at;

    // Get all active templates for this show
    const { data: templates, error: templatesError } = await supabase
      .from('show_category_templates')
      .select(`
        id,
        name,
        slug,
        description,
        icon,
        display_order,
        show_category_template_tags (
          tag_slug
        )
      `)
      .eq('show_id', show.id)
      .eq('is_active', true)
      .order('display_order');

    if (templatesError) {
      console.error('Error fetching templates:', templatesError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch templates' },
        { status: 500, headers: corsHeaders }
      );
    }

    // For each template, get content suggestions
    const suggestions = await Promise.all(
      (templates || []).map(async (template) => {
        const tagSlugs = template.show_category_template_tags?.map((t: any) => t.tag_slug) || [];

        if (tagSlugs.length === 0) {
          return {
            template_id: template.id,
            template_name: template.name,
            template_slug: template.slug,
            template_icon: template.icon,
            items: [],
          };
        }

        // Query content matching template tags since last episode
        const { data: content, error: contentError } = await supabase
          .from('content')
          .select(`
            id,
            platform,
            url,
            title,
            description,
            author_name,
            author_avatar,
            image_url,
            video_url,
            video_embed_url,
            tags,
            created_at
          `)
          .eq('approval_status', 'approved')
          .gt('created_at', sinceDate)
          .overlaps('tags', tagSlugs)
          .order('created_at', { ascending: false })
          .limit(30);

        if (contentError) {
          console.error(`Error fetching content for template ${template.id}:`, contentError);
          return {
            template_id: template.id,
            template_name: template.name,
            template_slug: template.slug,
            template_icon: template.icon,
            items: [],
          };
        }

        return {
          template_id: template.id,
          template_name: template.name,
          template_slug: template.slug,
          template_icon: template.icon,
          items: content || [],
        };
      })
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          episode_id: episodeId,
          since_date: sinceDate,
          suggestions,
        },
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('GET /api/shows/[slug]/episodes/[id]/suggestions error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
