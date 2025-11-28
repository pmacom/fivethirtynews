import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * GET /api/admin/channels - Get all channels with Discord mappings (grouped)
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Get all channel groups
    const { data: groups, error: groupsError } = await supabase
      .from('channel_groups')
      .select('id, slug, name, icon, description, display_order')
      .eq('is_active', true)
      .order('display_order');

    if (groupsError) {
      console.error('Error fetching groups:', groupsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch groups' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Get all channels with Discord mapping info
    const { data: channels, error: channelsError } = await supabase
      .from('channels')
      .select('id, group_id, slug, name, icon, description, display_order, discord_channel_id')
      .eq('is_active', true)
      .order('display_order');

    if (channelsError) {
      console.error('Error fetching channels:', channelsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch channels' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Group channels by group_id
    const channelsByGroup: Record<string, typeof channels> = {};
    channels?.forEach((channel) => {
      if (!channelsByGroup[channel.group_id]) {
        channelsByGroup[channel.group_id] = [];
      }
      channelsByGroup[channel.group_id].push(channel);
    });

    // Combine groups with their channels
    const result = (groups || []).map((group) => ({
      ...group,
      channels: channelsByGroup[group.id] || [],
    }));

    return NextResponse.json({ success: true, data: result }, { headers: corsHeaders });
  } catch (err) {
    console.error('GET admin/channels error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
