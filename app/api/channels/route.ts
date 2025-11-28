import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface Channel {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  description: string | null;
  display_order: number;
}

interface ChannelGroup {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  description: string | null;
  display_order: number;
  channels: Channel[];
}

/**
 * OPTIONS /api/channels
 * Handle preflight requests
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/channels
 * Get all channel groups with their channels
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Fetch all active channel groups
    const { data: groups, error: groupsError } = await supabase
      .from('channel_groups')
      .select('id, slug, name, icon, description, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (groupsError) {
      console.error('Error fetching channel groups:', groupsError);
      return NextResponse.json(
        { error: 'Failed to fetch channel groups' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Fetch all active channels
    const { data: channels, error: channelsError } = await supabase
      .from('channels')
      .select('id, group_id, slug, name, icon, description, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (channelsError) {
      console.error('Error fetching channels:', channelsError);
      return NextResponse.json(
        { error: 'Failed to fetch channels' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Group channels by their group_id
    const channelsByGroup: Record<string, Channel[]> = {};
    channels?.forEach((channel) => {
      const groupId = channel.group_id;
      if (!channelsByGroup[groupId]) {
        channelsByGroup[groupId] = [];
      }
      channelsByGroup[groupId].push({
        id: channel.id,
        slug: channel.slug,
        name: channel.name,
        icon: channel.icon,
        description: channel.description,
        display_order: channel.display_order,
      });
    });

    // Build response with nested channels
    const result: ChannelGroup[] = (groups || []).map((group) => ({
      id: group.id,
      slug: group.slug,
      name: group.name,
      icon: group.icon,
      description: group.description,
      display_order: group.display_order,
      channels: channelsByGroup[group.id] || [],
    }));

    return NextResponse.json({
      success: true,
      data: result,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
