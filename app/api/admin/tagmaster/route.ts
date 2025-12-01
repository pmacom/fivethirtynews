import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * GET /api/admin/tagmaster - Get next untagged content item and stats
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('530_session')?.value;
  const authHeader = request.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
  const token = sessionToken || bearerToken;

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const supabase = await createClient();

    // Verify admin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, is_admin, display_name')
      .eq('session_token', token)
      .single();

    if (userError || !user?.is_admin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Get counts
    const { count: totalCount } = await supabase
      .from('content')
      .select('*', { count: 'exact', head: true })
      .not('platform', 'is', null)
      .neq('platform', '');

    const { count: untaggedCount } = await supabase
      .from('content')
      .select('*', { count: 'exact', head: true })
      .not('platform', 'is', null)
      .neq('platform', '')
      .or('primary_channel.is.null,channels.is.null,channels.eq.[]');

    const taggedCount = (totalCount || 0) - (untaggedCount || 0);

    // Get next untagged content item
    const { data: nextItem, error: itemError } = await supabase
      .from('content')
      .select('*')
      .not('platform', 'is', null)
      .neq('platform', '')
      .or('primary_channel.is.null,channels.is.null,channels.eq.[]')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    // Get all channel groups with channels for the picker
    const { data: groups } = await supabase
      .from('channel_groups')
      .select('id, slug, name, icon')
      .eq('is_active', true)
      .order('display_order');

    const { data: channels } = await supabase
      .from('channels')
      .select('id, group_id, slug, name, icon')
      .eq('is_active', true)
      .order('display_order');

    // Get available additional tags (sorted by usage)
    const { data: availableTags } = await supabase
      .from('tags')
      .select('id, slug, name, usage_count')
      .order('usage_count', { ascending: false })
      .limit(50);

    // Group channels by group_id
    type ChannelType = NonNullable<typeof channels>[number];
    const channelsByGroup: Record<string, ChannelType[]> = {};
    channels?.forEach((channel) => {
      if (!channelsByGroup[channel.group_id]) {
        channelsByGroup[channel.group_id] = [];
      }
      channelsByGroup[channel.group_id]!.push(channel);
    });

    const channelGroups = (groups || []).map((group) => ({
      ...group,
      channels: channelsByGroup[group.id] || [],
    }));

    return NextResponse.json({
      success: true,
      stats: {
        total: totalCount || 0,
        tagged: taggedCount,
        untagged: untaggedCount || 0,
        percentComplete: totalCount ? Math.round((taggedCount / totalCount) * 100) : 100,
      },
      currentItem: nextItem || null,
      channelGroups,
      availableTags: availableTags || [],
      user: {
        id: user.id,
        displayName: user.display_name,
      },
    }, { headers: corsHeaders });

  } catch (err) {
    console.error('GET tagmaster error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/admin/tagmaster - Tag content and get next item
 * Body: { contentId: string, channels: string[], primaryChannel: string, tags?: string[], skip?: boolean }
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('530_session')?.value;
  const authHeader = request.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
  const token = sessionToken || bearerToken;

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const supabase = await createClient();

    // Verify admin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, is_admin')
      .eq('session_token', token)
      .single();

    if (userError || !user?.is_admin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403, headers: corsHeaders }
      );
    }

    const { contentId, channels, primaryChannel, tags, skip } = await request.json();

    if (!contentId) {
      return NextResponse.json(
        { success: false, error: 'Content ID required' },
        { status: 400, headers: corsHeaders }
      );
    }

    let pointsEarned = 0;
    let action = 'skipped';

    if (!skip) {
      if (!channels || channels.length === 0 || !primaryChannel) {
        return NextResponse.json(
          { success: false, error: 'Channels and primary channel required' },
          { status: 400, headers: corsHeaders }
        );
      }

      // Process additional tags - create new ones if they don't exist
      const processedTags: string[] = [];
      if (tags && Array.isArray(tags)) {
        for (const tag of tags) {
          const slug = tag.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          if (!slug) continue;

          // Try to find existing tag
          const { data: existingTag } = await supabase
            .from('tags')
            .select('slug, usage_count')
            .eq('slug', slug)
            .single();

          if (!existingTag) {
            // Create new tag
            await supabase.from('tags').insert({
              slug,
              name: tag.trim(),
              usage_count: 1,
              created_by: user.id,
            });
          } else {
            // Increment usage count directly
            await supabase
              .from('tags')
              .update({ usage_count: (existingTag.usage_count || 0) + 1 })
              .eq('slug', slug);
          }
          processedTags.push(slug);
        }
      }

      // Update the content with channels and tags
      const { error: updateError } = await supabase
        .from('content')
        .update({
          channels: channels,
          primary_channel: primaryChannel,
          tags: processedTags,
        })
        .eq('id', contentId);

      if (updateError) {
        console.error('Error updating content:', updateError);
        return NextResponse.json(
          { success: false, error: 'Failed to update content' },
          { status: 500, headers: corsHeaders }
        );
      }

      // Calculate points (more channels/tags = more points)
      pointsEarned = 10 + (channels.length * 5) + (processedTags.length * 3);
      action = 'tagged';
    }

    // Get updated stats and next item
    const { count: totalCount } = await supabase
      .from('content')
      .select('*', { count: 'exact', head: true })
      .not('platform', 'is', null)
      .neq('platform', '');

    const { count: untaggedCount } = await supabase
      .from('content')
      .select('*', { count: 'exact', head: true })
      .not('platform', 'is', null)
      .neq('platform', '')
      .or('primary_channel.is.null,channels.is.null,channels.eq.[]');

    const taggedCount = (totalCount || 0) - (untaggedCount || 0);

    // Get next untagged item
    const { data: nextItem } = await supabase
      .from('content')
      .select('*')
      .not('platform', 'is', null)
      .neq('platform', '')
      .or('primary_channel.is.null,channels.is.null,channels.eq.[]')
      .neq('id', contentId) // Exclude the one we just processed
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    return NextResponse.json({
      success: true,
      action,
      pointsEarned,
      stats: {
        total: totalCount || 0,
        tagged: taggedCount,
        untagged: untaggedCount || 0,
        percentComplete: totalCount ? Math.round((taggedCount / totalCount) * 100) : 100,
      },
      nextItem: nextItem || null,
    }, { headers: corsHeaders });

  } catch (err) {
    console.error('POST tagmaster error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/admin/tagmaster - Delete content item
 * Body: { contentId: string }
 */
export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('530_session')?.value;
  const authHeader = request.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
  const token = sessionToken || bearerToken;

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const supabase = await createClient();

    // Verify admin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, is_admin')
      .eq('session_token', token)
      .single();

    if (userError || !user?.is_admin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403, headers: corsHeaders }
      );
    }

    const { contentId } = await request.json();

    if (!contentId) {
      return NextResponse.json(
        { success: false, error: 'Content ID required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Delete the content
    const { error: deleteError } = await supabase
      .from('content')
      .delete()
      .eq('id', contentId);

    if (deleteError) {
      console.error('Error deleting content:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete content' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Get updated stats and next item
    const { count: totalCount } = await supabase
      .from('content')
      .select('*', { count: 'exact', head: true })
      .not('platform', 'is', null)
      .neq('platform', '');

    const { count: untaggedCount } = await supabase
      .from('content')
      .select('*', { count: 'exact', head: true })
      .not('platform', 'is', null)
      .neq('platform', '')
      .or('primary_channel.is.null,channels.is.null,channels.eq.[]');

    const taggedCount = (totalCount || 0) - (untaggedCount || 0);

    // Get next untagged item
    const { data: nextItem } = await supabase
      .from('content')
      .select('*')
      .not('platform', 'is', null)
      .neq('platform', '')
      .or('primary_channel.is.null,channels.is.null,channels.eq.[]')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    return NextResponse.json({
      success: true,
      action: 'deleted',
      stats: {
        total: totalCount || 0,
        tagged: taggedCount,
        untagged: untaggedCount || 0,
        percentComplete: totalCount ? Math.round((taggedCount / totalCount) * 100) : 100,
      },
      nextItem: nextItem || null,
    }, { headers: corsHeaders });

  } catch (err) {
    console.error('DELETE tagmaster error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
