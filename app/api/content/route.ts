import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

/**
 * Fetch tweet data from Twitter's syndication API and store in tweets table
 * This runs in the background and doesn't block the response
 */
async function fetchAndStoreTweet(tweetId: string, supabase: any): Promise<void> {
  try {
    // Check if tweet already exists
    const { data: existing } = await supabase
      .from('tweets')
      .select('id')
      .eq('id', tweetId)
      .single();

    if (existing) {
      console.log(`Tweet ${tweetId} already in database`);
      return;
    }

    // Fetch from Twitter syndication API
    const url = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en&token=0`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; 530Society/1.0)' },
    });

    if (!response.ok) {
      console.log(`Failed to fetch tweet ${tweetId}: HTTP ${response.status}`);
      return;
    }

    const tweetData = await response.json();

    // Store in tweets table
    const { error } = await supabase
      .from('tweets')
      .upsert({
        id: tweetId,
        data: tweetData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) {
      console.error(`Failed to store tweet ${tweetId}:`, error);
    } else {
      console.log(`Successfully fetched and stored tweet ${tweetId}`);
    }
  } catch (error) {
    console.error(`Error fetching tweet ${tweetId}:`, error);
  }
}

// CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * OPTIONS /api/content
 * Handle preflight requests
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/content
 * Create or update tagged content (multi-platform)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const {
      platform,
      platformContentId,
      url,
      tags,
      channels,
      primaryChannel,
      title,
      description,
      content,
      author,
      authorUsername,
      authorUrl,
      authorAvatarUrl,
      thumbnailUrl,
      mediaAssets,
      metadata,
      contentCreatedAt
    } = body;

    // Check user authentication and role for approval workflow
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('530_session')?.value;
    // Also check Authorization header for extension/API clients
    const authHeader = request.headers.get('Authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
    const token = sessionToken || bearerToken;

    let submitterUserId: string | null = null;
    let submitterUsername: string | null = null;
    let autoApprove = false;

    if (token) {
      const { data: user } = await supabase
        .from('users')
        .select('id, is_admin, is_moderator, discord_username')
        .eq('session_token', token)
        .single();

      if (user) {
        submitterUserId = user.id;
        submitterUsername = user.discord_username;
        // Admins and moderators get auto-approved (hierarchical)
        autoApprove = user.is_admin || user.is_moderator;
      }
    }

    // Validate required fields
    if (!platform || !platformContentId || !url) {
      return NextResponse.json(
        { error: 'platform, platformContentId, and url are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Require either tags or channels
    const hasChannels = channels && Array.isArray(channels) && channels.length > 0;
    const hasTags = tags && Array.isArray(tags) && tags.length > 0;

    if (!hasChannels && !hasTags) {
      return NextResponse.json(
        { error: 'Either tags or channels array is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate deterministic ID
    const id = `${platform}:${platformContentId}`;

    // Check if content already exists
    const { data: existingContent, error: checkError } = await supabase
      .from('content')
      .select('*')
      .eq('platform', platform)
      .eq('platform_content_id', platformContentId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing content:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing content' },
        { status: 500, headers: corsHeaders }
      );
    }

    if (existingContent) {
      // Update existing content
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (hasTags) updateData.tags = tags;
      if (hasChannels) {
        updateData.channels = channels;
        updateData.primary_channel = primaryChannel || channels[0] || null;
      }

      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      // Note: 'content' field maps to 'description' column (no 'content' column exists)
      if (content !== undefined && description === undefined) updateData.description = content;
      if (author !== undefined) updateData.author_name = author;
      if (authorUsername !== undefined) updateData.author_username = authorUsername;
      if (authorUrl !== undefined) updateData.author_url = authorUrl;
      if (authorAvatarUrl !== undefined) updateData.author_avatar_url = authorAvatarUrl;
      if (thumbnailUrl !== undefined) updateData.thumbnail_url = thumbnailUrl;
      if (mediaAssets !== undefined) updateData.media_assets = mediaAssets;
      if (metadata !== undefined) updateData.metadata = metadata;
      if (contentCreatedAt !== undefined) updateData.content_created_at = contentCreatedAt;

      const { data, error } = await supabase
        .from('content')
        .update(updateData)
        .eq('platform', platform)
        .eq('platform_content_id', platformContentId)
        .select()
        .single();

      if (error) {
        console.error('Error updating content:', error);
        return NextResponse.json(
          { error: 'Failed to update content', details: error.message },
          { status: 500, headers: corsHeaders }
        );
      }

      return NextResponse.json({
        success: true,
        data,
        action: 'updated'
      }, { headers: corsHeaders });

    } else {
      // Create new content (id is auto-generated UUID)
      // Note: 'content' field maps to 'description' column if description not provided
      const finalDescription = description || content || null;
      const contentData: Record<string, unknown> = {
        platform,
        platform_content_id: platformContentId,
        url,
        tags: hasTags ? tags : [],
        channels: hasChannels ? channels : [],
        primary_channel: hasChannels ? (primaryChannel || channels[0] || null) : null,
        title: title || null,
        description: finalDescription,
        content_type: platform, // Map to existing column
        content_url: url, // Map to existing column
        content_id: platformContentId, // Map to existing column
        submitted_by: submitterUsername || 'extension',
        author_name: author || null,
        author_username: authorUsername || null,
        author_url: authorUrl || null,
        author_avatar_url: authorAvatarUrl || null,
        thumbnail_url: thumbnailUrl || null,
        media_assets: mediaAssets || [],
        metadata: metadata || {},
        content_created_at: contentCreatedAt || null,
        // Approval workflow fields
        submitted_by_user_id: submitterUserId,
        approval_status: autoApprove ? 'approved' : 'pending',
        approved_by: autoApprove ? submitterUserId : null,
        approved_at: autoApprove ? new Date().toISOString() : null,
      };

      const { data, error } = await supabase
        .from('content')
        .insert(contentData)
        .select()
        .single();

      if (error) {
        console.error('Error creating content:', error);
        return NextResponse.json(
          { error: 'Failed to create content', details: error.message },
          { status: 500, headers: corsHeaders }
        );
      }

      // For Twitter content, fetch and store tweet data in background
      // This doesn't block the response - tweet data will be available on next load
      if (platform === 'twitter' && platformContentId) {
        fetchAndStoreTweet(platformContentId, supabase).catch(err => {
          console.error('Background tweet fetch failed:', err);
        });
      }

      return NextResponse.json({
        success: true,
        data,
        action: 'created'
      }, { headers: corsHeaders });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET /api/content?limit=20&offset=0&channel=ai&since=2024-01-01&platform=twitter
 * Get all tagged content with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const platform = searchParams.get('platform');
    const channel = searchParams.get('channel');
    const group = searchParams.get('group');
    const since = searchParams.get('since');

    // Build query with count for pagination
    let query = supabase
      .from('content')
      .select('*', { count: 'exact' })
      .eq('approval_status', 'approved')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Platform filter
    if (platform) {
      query = query.eq('platform', platform);
    }

    // Group filter - lookup all channels in the group and filter by them
    if (group) {
      // First, get the group ID
      const { data: groupData, error: groupError } = await supabase
        .from('channel_groups')
        .select('id')
        .eq('slug', group)
        .eq('is_active', true)
        .single();

      if (groupError || !groupData) {
        return NextResponse.json({
          success: true,
          data: [],
          pagination: { offset, limit, total: 0, hasMore: false }
        }, { headers: corsHeaders });
      }

      // Get all channels in this group
      const { data: channelsData, error: channelsError } = await supabase
        .from('channels')
        .select('slug')
        .eq('group_id', groupData.id)
        .eq('is_active', true);

      if (channelsError || !channelsData || channelsData.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
          pagination: { offset, limit, total: 0, hasMore: false }
        }, { headers: corsHeaders });
      }

      // If a specific channel is also provided, filter to just that channel
      const channelSlugs = channel
        ? [channel]
        : channelsData.map(c => c.slug);

      // Also include the group slug itself for backward compatibility
      // (some content may have primary_channel = group slug instead of specific channel)
      const allSlugs = channel ? channelSlugs : [group, ...channelSlugs];

      // Build OR conditions for all channels and group
      const orConditions = allSlugs
        .map(slug => `primary_channel.eq.${slug},channels.cs.["${slug}"]`)
        .join(',');

      query = query.or(orConditions);
    }
    // Channel filter (without group) - check primary_channel OR channels array contains
    else if (channel) {
      query = query.or(`primary_channel.eq.${channel},channels.cs.["${channel}"]`);
    }

    // Date filter - content created since date
    if (since) {
      query = query.gte('created_at', since);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching content:', error);
      return NextResponse.json(
        { error: 'Failed to fetch content' },
        { status: 500, headers: corsHeaders }
      );
    }

    const total = count || 0;
    const hasMore = offset + limit < total;

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        offset,
        limit,
        total,
        hasMore
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
