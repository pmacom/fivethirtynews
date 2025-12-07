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
 * GET /api/shows/[slug]/episodes/[id]/curate
 * Returns unified Kanban data: columns (content_blocks) with all items (selected + suggestions)
 * Query params:
 *   - include_unapproved: "true" to include non-approved content
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug, id: episodeId } = await params;
    const { searchParams } = new URL(request.url);
    const includeUnapproved = searchParams.get('include_unapproved') === 'true';

    const user = await getAuthenticatedUser(request, supabase);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get show
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('id, name, slug, created_at')
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

    // Get episode
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('id, title, description, date, scheduled_at, episode_number, status, content_starts_at')
      .eq('id', episodeId)
      .eq('show_id', show.id)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json(
        { success: false, error: 'Episode not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Determine content window
    let sinceDate: string;
    if (episode.content_starts_at) {
      sinceDate = episode.content_starts_at;
    } else {
      const episodeDate = episode.date || episode.scheduled_at?.split('T')[0];
      if (episodeDate) {
        const defaultStart = new Date(episodeDate);
        defaultStart.setDate(defaultStart.getDate() - 7);
        sinceDate = defaultStart.toISOString();
      } else {
        sinceDate = show.created_at;
      }
    }

    // For episodes still being curated (scheduled/draft), extend window to now
    // so newly added content appears. For completed episodes, use scheduled time.
    let untilDate: string | null;
    if (episode.status === 'completed' || episode.status === 'live') {
      untilDate = episode.scheduled_at || (episode.date ? `${episode.date}T23:59:59Z` : null);
    } else {
      // Episode is still being curated - include content up to now
      untilDate = new Date().toISOString();
    }

    console.log('[Curate] Content window:', {
      episodeId,
      showSlug: slug,
      sinceDate,
      untilDate,
      includeUnapproved,
      episodeContentStartsAt: episode.content_starts_at,
      episodeDate: episode.date,
      episodeScheduledAt: episode.scheduled_at,
    });

    // Get content blocks (columns) with their selected items
    const { data: blocks, error: blocksError } = await supabase
      .from('content_blocks')
      .select(`
        id,
        title,
        description,
        weight,
        template_id,
        tags,
        content_block_items (
          id,
          news_id,
          weight,
          note
        )
      `)
      .eq('episode_id', episodeId)
      .order('weight');

    if (blocksError) {
      console.error('Error fetching blocks:', blocksError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch content blocks' },
        { status: 500, headers: corsHeaders }
      );
    }

    // If no blocks exist, create them from show templates
    let columns = blocks || [];
    if (columns.length === 0) {
      console.log('[Curate] No blocks exist, creating from templates for show:', show.id);

      // Get show templates
      const { data: templates, error: templatesError } = await supabase
        .from('show_category_templates')
        .select(`
          id,
          name,
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

      console.log('[Curate] Templates query result:', {
        error: templatesError?.message || null,
        count: templates?.length || 0,
        templates: templates?.map((t: any) => ({
          id: t.id,
          name: t.name,
          tagsFromJoin: t.show_category_template_tags,
        })) || [],
      });

      // Create content_blocks from templates
      if (templates && templates.length > 0) {
        const blocksToInsert = templates.map((template, index) => {
          const tags = template.show_category_template_tags?.map((t: any) => t.tag_slug) || [];
          console.log(`[Curate] Template "${template.name}" -> tags:`, tags);
          return {
            episode_id: episodeId,
            title: template.name,
            description: template.description,
            weight: index,
            template_id: template.id,
            tags,
          };
        });

        const { data: newBlocks, error: insertError } = await supabase
          .from('content_blocks')
          .insert(blocksToInsert)
          .select(`
            id,
            title,
            description,
            weight,
            template_id,
            tags,
            content_block_items (
              id,
              news_id,
              weight,
              note
            )
          `);

        if (insertError) {
          console.error('Error creating blocks:', insertError);
        } else {
          columns = newBlocks || [];
        }
      }
    } else {
      // Backfill tags from templates for existing blocks that have template_id but no tags
      const blocksNeedingTags = columns.filter(
        (col: any) => col.template_id && (!col.tags || col.tags.length === 0)
      );

      if (blocksNeedingTags.length > 0) {
        console.log('[Curate] Backfilling tags for blocks:', blocksNeedingTags.map((b: any) => b.title));

        const templateIds = blocksNeedingTags.map((b: any) => b.template_id);
        const { data: templatesWithTags } = await supabase
          .from('show_category_templates')
          .select(`
            id,
            show_category_template_tags (
              tag_slug
            )
          `)
          .in('id', templateIds);

        if (templatesWithTags) {
          const templateTagsMap = new Map<string, string[]>();
          for (const template of templatesWithTags) {
            const tags = template.show_category_template_tags?.map((t: any) => t.tag_slug) || [];
            templateTagsMap.set(template.id, tags);
          }

          // Update each block with its template's tags
          for (const block of blocksNeedingTags) {
            const tags = templateTagsMap.get(block.template_id);
            if (tags && tags.length > 0) {
              console.log(`[Curate] Updating block "${block.title}" with tags:`, tags);
              const { error: updateError } = await supabase
                .from('content_blocks')
                .update({ tags })
                .eq('id', block.id);

              if (updateError) {
                console.error(`[Curate] Failed to update block ${block.id}:`, updateError);
              } else {
                // Update in-memory column
                block.tags = tags;
              }
            }
          }
        }
      }
    }

    console.log('[Curate] Processing columns:', columns.map((c: any) => ({
      id: c.id,
      title: c.title,
      tags: c.tags,
      selectedItemsCount: c.content_block_items?.length || 0,
    })));

    // Diagnostic: Check what content exists in the date range
    // Use content_created_at (original posting time) not created_at (DB insertion time)
    const { data: diagnosticContent, count: totalCount } = await supabase
      .from('content')
      .select('id, tags, approval_status, content_created_at', { count: 'exact' })
      .gte('content_created_at', sinceDate)
      .lte('content_created_at', untilDate || new Date().toISOString())
      .limit(10);

    console.log('[Curate] Diagnostic - Content in date range:', {
      totalCount,
      sinceDate,
      untilDate,
      sampleContent: diagnosticContent?.map((c: any) => ({
        id: c.id.substring(0, 8),
        tags: c.tags,
        status: c.approval_status,
        content_created_at: c.content_created_at,
      })) || [],
    });

    // For each column, get content suggestions and merge with selected items
    const columnsWithItems = await Promise.all(
      columns.map(async (column: any) => {
        const tagSlugs = column.tags || [];

        console.log(`[Curate] Column "${column.title}":`, {
          columnId: column.id,
          tags: tagSlugs,
          hasTemplateId: !!column.template_id,
        });

        // If no tags configured, only show already-selected items (no suggestions)
        if (tagSlugs.length === 0) {
          console.log(`[Curate] Column "${column.title}" has NO TAGS - showing only selected items`);
          // Fetch selected items' content directly
          const selectedNewsIds = (column.content_block_items || []).map((item: any) => item.news_id);

          let selectedContent: any[] = [];
          if (selectedNewsIds.length > 0) {
            const { data } = await supabase
              .from('content')
              .select(`
                id,
                platform,
                url,
                title,
                description,
                author_name,
                author_avatar_url,
                thumbnail_url,
                media_assets,
                tags,
                approval_status,
                created_at
              `)
              .in('id', selectedNewsIds);
            selectedContent = data || [];
          }

          interface BlockItem {
            id: string;
            news_id: string;
            weight: number;
            note: string | null;
          }
          const selectedItemsMap = new Map<string, BlockItem>(
            (column.content_block_items || []).map((item: BlockItem) => [item.news_id, item])
          );

          const items = selectedContent.map((content: any) => {
            const blockItem = selectedItemsMap.get(content.id);
            return {
              id: content.id,
              block_item_id: blockItem?.id || null,
              is_selected: true,
              weight: blockItem?.weight ?? 0,
              note: blockItem?.note || null,
              content,
            };
          }).sort((a: any, b: any) => a.weight - b.weight);

          return {
            id: column.id,
            title: column.title,
            description: column.description,
            weight: column.weight,
            template_id: column.template_id,
            tags: column.tags || [],
            items,
          };
        }

        // Query content matching tags OR channels within date range
        // Build filters for BOTH tags and channels (JSONB arrays) + primary_channel
        const tagFilters = tagSlugs.map((tag: string) => `tags.cs.["${tag}"]`);
        const channelFilters = tagSlugs.map((slug: string) => `channels.cs.["${slug}"]`);
        const primaryChannelFilters = tagSlugs.map((slug: string) => `primary_channel.eq.${slug}`);

        // Combine all into one OR clause - content matches if ANY filter hits
        const allFilters = [...tagFilters, ...channelFilters, ...primaryChannelFilters].join(',');

        // Query by content_created_at (original posting time) not created_at (DB insertion time)
        let contentQuery = supabase
          .from('content')
          .select(`
            id,
            platform,
            url,
            title,
            description,
            author_name,
            author_avatar_url,
            thumbnail_url,
            media_assets,
            tags,
            approval_status,
            content_created_at,
            created_at
          `)
          .gte('content_created_at', sinceDate)
          .or(allFilters)
          .order('content_created_at', { ascending: false })
          .limit(50);

        // Apply approval filter
        if (!includeUnapproved) {
          contentQuery = contentQuery.eq('approval_status', 'approved');
        }

        // Apply upper bound
        if (untilDate) {
          contentQuery = contentQuery.lte('content_created_at', untilDate);
        }

        const { data: contentItems, error: contentError } = await contentQuery;

        console.log(`[Curate] Column "${column.title}" query result:`, {
          tags: tagSlugs,
          sinceDate,
          untilDate,
          includeUnapproved,
          resultCount: contentItems?.length || 0,
          error: contentError?.message || null,
          sampleTitles: contentItems?.slice(0, 3).map((c: any) => c.title || c.description?.substring(0, 50)) || [],
        });

        if (contentError) {
          console.error(`[Curate] Error fetching content for column ${column.id}:`, contentError);
        }

        // Build items list: merge selected and suggestions
        interface BlockItem {
          id: string;
          news_id: string;
          weight: number;
          note: string | null;
        }
        const selectedItemsMap = new Map<string, BlockItem>(
          (column.content_block_items || []).map((item: BlockItem) => [item.news_id, item])
        );

        const items = (contentItems || []).map((content: any) => {
          const blockItem = selectedItemsMap.get(content.id);
          return {
            id: content.id,
            block_item_id: blockItem?.id || null,
            is_selected: !!blockItem,
            weight: blockItem?.weight ?? 999999,
            note: blockItem?.note || null,
            content,
          };
        });

        // Sort: selected items by weight first, then unselected by date
        items.sort((a: any, b: any) => {
          if (a.is_selected && !b.is_selected) return -1;
          if (!a.is_selected && b.is_selected) return 1;
          if (a.is_selected && b.is_selected) return a.weight - b.weight;
          // Sort by content_created_at (original posting time)
          const aDate = a.content.content_created_at || a.content.created_at;
          const bDate = b.content.content_created_at || b.content.created_at;
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        });

        return {
          id: column.id,
          title: column.title,
          description: column.description,
          weight: column.weight,
          template_id: column.template_id,
          tags: column.tags || [],
          items,
        };
      })
    );

    // Fetch prev/next episodes for navigation
    const currentEpisodeNumber = episode.episode_number;
    const currentDate = episode.scheduled_at || episode.date;

    let prevEpisode = null;
    let nextEpisode = null;

    if (currentEpisodeNumber != null) {
      // Get previous episode (lower episode number)
      const { data: prevData } = await supabase
        .from('episodes')
        .select('id, title, episode_number, date, scheduled_at')
        .eq('show_id', show.id)
        .lt('episode_number', currentEpisodeNumber)
        .order('episode_number', { ascending: false })
        .limit(1)
        .single();

      if (prevData) {
        prevEpisode = {
          id: prevData.id,
          title: prevData.title || `Episode ${prevData.episode_number}`,
          episode_number: prevData.episode_number,
          date: prevData.date,
        };
      }

      // Get next episode (higher episode number)
      const { data: nextData } = await supabase
        .from('episodes')
        .select('id, title, episode_number, date, scheduled_at')
        .eq('show_id', show.id)
        .gt('episode_number', currentEpisodeNumber)
        .order('episode_number', { ascending: true })
        .limit(1)
        .single();

      if (nextData) {
        nextEpisode = {
          id: nextData.id,
          title: nextData.title || `Episode ${nextData.episode_number}`,
          episode_number: nextData.episode_number,
          date: nextData.date,
        };
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          episode: {
            id: episode.id,
            title: episode.title || `Episode ${episode.episode_number || ''}`,
            date: episode.date,
            scheduled_at: episode.scheduled_at,
            episode_number: episode.episode_number,
            status: episode.status,
          },
          show: {
            id: show.id,
            name: show.name,
            slug: show.slug,
          },
          navigation: {
            prev: prevEpisode,
            next: nextEpisode,
          },
          content_window: {
            since_date: sinceDate,
            until_date: untilDate,
          },
          columns: columnsWithItems,
        },
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('GET /api/shows/[slug]/episodes/[id]/curate error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
