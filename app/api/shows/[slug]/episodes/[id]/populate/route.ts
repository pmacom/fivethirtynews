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
 * POST /api/shows/[slug]/episodes/[id]/populate
 * Auto-populate content_blocks from category templates
 * Creates content_blocks and content_block_items based on template suggestions
 */
export async function POST(
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

    // Check if episode already has content_blocks (don't re-populate)
    const { data: existingBlocks } = await supabase
      .from('content_blocks')
      .select('id')
      .eq('episode_id', episodeId)
      .limit(1);

    if (existingBlocks && existingBlocks.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Episode already has content blocks. Use suggestions endpoint to add more.' },
        { status: 409, headers: corsHeaders }
      );
    }

    // Get last completed episode date
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

    // Get all active templates
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

    if (templatesError || !templates || templates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No category templates found for this show' },
        { status: 404, headers: corsHeaders }
      );
    }

    const createdBlocks = [];

    // For each template, create content_block and populate items
    for (const template of templates) {
      const tagSlugs = template.show_category_template_tags?.map((t: any) => t.tag_slug) || [];

      // Create content_block for this template
      const { data: contentBlock, error: blockError } = await supabase
        .from('content_blocks')
        .insert({
          episode_id: episodeId,
          title: template.name,
          description: template.description,
          weight: template.display_order,
          template_id: template.id,
        })
        .select('id')
        .single();

      if (blockError || !contentBlock) {
        console.error(`Error creating content_block for template ${template.id}:`, blockError);
        continue;
      }

      // Get content matching template tags
      if (tagSlugs.length > 0) {
        const { data: content, error: contentError } = await supabase
          .from('content')
          .select('id')
          .eq('approval_status', 'approved')
          .gt('created_at', sinceDate)
          .overlaps('tags', tagSlugs)
          .order('created_at', { ascending: false })
          .limit(30);

        if (!contentError && content && content.length > 0) {
          // Create content_block_items
          const items = content.map((c: any, index: number) => ({
            content_block_id: contentBlock.id,
            news_id: c.id,
            weight: index,
          }));

          const { error: itemsError } = await supabase
            .from('content_block_items')
            .insert(items);

          if (itemsError) {
            console.error(`Error creating items for block ${contentBlock.id}:`, itemsError);
          }
        }
      }

      createdBlocks.push({
        block_id: contentBlock.id,
        template_id: template.id,
        template_name: template.name,
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          episode_id: episodeId,
          since_date: sinceDate,
          blocks_created: createdBlocks.length,
          blocks: createdBlocks,
        },
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (err) {
    console.error('POST /api/shows/[slug]/episodes/[id]/populate error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
