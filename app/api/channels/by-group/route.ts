import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/channels/by-group?group=thirddimension&withContent=true
 * Returns channels in a group, optionally filtered to only those with approved content
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const groupSlug = searchParams.get('group');
    const withContent = searchParams.get('withContent') === 'true';

    if (!groupSlug) {
      return NextResponse.json(
        { success: false, error: 'group parameter is required' },
        { status: 400 }
      );
    }

    // Get group ID from slug
    const { data: groupData, error: groupError } = await supabase
      .from('channel_groups')
      .select('id, name, icon')
      .eq('slug', groupSlug)
      .eq('is_active', true)
      .single();

    if (groupError || !groupData) {
      return NextResponse.json({
        success: true,
        data: [],
        group: null,
      });
    }

    // Get all active channels in this group
    const { data: channelsData, error: channelsError } = await supabase
      .from('channels')
      .select('slug, name, icon, display_order')
      .eq('group_id', groupData.id)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (channelsError || !channelsData) {
      return NextResponse.json({
        success: true,
        data: [],
        group: { name: groupData.name, icon: groupData.icon },
      });
    }

    // If withContent=true, filter to only channels that have approved content
    if (withContent) {
      const channelSlugs = channelsData.map(c => c.slug);

      // Get counts of approved content per channel
      // We check both primary_channel and channels array
      const { data: contentCounts, error: countError } = await supabase
        .from('content')
        .select('primary_channel, channels')
        .eq('approval_status', 'approved');

      if (countError) {
        console.error('Error fetching content counts:', countError);
        // Return all channels if we can't filter
        return NextResponse.json({
          success: true,
          data: channelsData,
          group: { name: groupData.name, icon: groupData.icon },
        });
      }

      // Build a set of channels that have content
      const channelsWithContent = new Set<string>();

      contentCounts?.forEach(content => {
        // Check primary_channel
        if (content.primary_channel && channelSlugs.includes(content.primary_channel)) {
          channelsWithContent.add(content.primary_channel);
        }
        // Check channels array
        if (content.channels && Array.isArray(content.channels)) {
          content.channels.forEach((ch: string) => {
            if (channelSlugs.includes(ch)) {
              channelsWithContent.add(ch);
            }
          });
        }
      });

      // Filter channels to only those with content
      const filteredChannels = channelsData.filter(ch => channelsWithContent.has(ch.slug));

      return NextResponse.json({
        success: true,
        data: filteredChannels,
        group: { name: groupData.name, icon: groupData.icon },
      });
    }

    return NextResponse.json({
      success: true,
      data: channelsData,
      group: { name: groupData.name, icon: groupData.icon },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
