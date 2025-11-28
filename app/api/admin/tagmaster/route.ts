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

    // Group channels by group_id
    const channelsByGroup: Record<string, typeof channels> = {};
    channels?.forEach((channel) => {
      if (!channelsByGroup[channel.group_id]) {
        channelsByGroup[channel.group_id] = [];
      }
      channelsByGroup[channel.group_id].push(channel);
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
 * Body: { contentId: string, channels: string[], primaryChannel: string, skip?: boolean }
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

    const { contentId, channels, primaryChannel, skip } = await request.json();

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

      // Update the content with tags
      const { error: updateError } = await supabase
        .from('content')
        .update({
          channels: channels,
          primary_channel: primaryChannel,
        })
        .eq('id', contentId);

      if (updateError) {
        console.error('Error updating content:', updateError);
        return NextResponse.json(
          { success: false, error: 'Failed to update content' },
          { status: 500, headers: corsHeaders }
        );
      }

      // Calculate points (more channels = more points, bonus for speed)
      pointsEarned = 10 + (channels.length * 5);
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
