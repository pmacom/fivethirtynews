import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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
      const contentData: Record<string, unknown> = {
        platform,
        platform_content_id: platformContentId,
        url,
        tags: hasTags ? tags : [],
        channels: hasChannels ? channels : [],
        primary_channel: hasChannels ? (primaryChannel || channels[0] || null) : null,
        title: title || null,
        description: description || null,
        content_type: platform, // Map to existing column
        content_url: url, // Map to existing column
        content_id: platformContentId, // Map to existing column
        submitted_by: authorUsername || author || 'extension',
        author_name: author || null,
        author_username: authorUsername || null,
        author_url: authorUrl || null,
        author_avatar_url: authorAvatarUrl || null,
        thumbnail_url: thumbnailUrl || null,
        media_assets: mediaAssets || [],
        metadata: metadata || {},
        content_created_at: contentCreatedAt || null
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
 * GET /api/content?limit=100&platform=twitter
 * Get all tagged content
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const platform = searchParams.get('platform');

    let query = supabase
      .from('content')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching content:', error);
      return NextResponse.json(
        { error: 'Failed to fetch content' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      data
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
