import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CreatorService } from '@/lib/services/CreatorService';
import { MetadataExtractor } from '@/lib/services/MetadataExtractor';
import { MetadataValidator } from '@/lib/services/MetadataValidator';

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
 *
 * Body format:
 * {
 *   platform: 'twitter' | 'youtube' | 'reddit' | 'bluesky' | 'generic',
 *   platformContentId: string (e.g., tweet ID, video ID, post ID),
 *   url: string,
 *   tags?: string[], // Array of tag slugs (legacy)
 *   channels?: string[], // Array of channel slugs (new system)
 *   primaryChannel?: string, // Primary channel slug
 *   title?: string,
 *   description?: string,
 *   content?: string,
 *   author?: string,
 *   authorUsername?: string,
 *   authorUrl?: string,
 *   authorAvatarUrl?: string,
 *   thumbnailUrl?: string,
 *   mediaAssets?: Array<{type, url, width?, height?, duration?, mimeType?}>,
 *   metadata?: Record<string, any>,
 *   contentCreatedAt?: string (ISO timestamp)
 * }
 */
export async function POST(request: NextRequest) {
  try {
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

    // Require either tags or channels (support both systems)
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

    // Create or update creator if author information is provided
    let authorId: string | undefined;
    if (author && authorUsername) {
      try {
        authorId = await CreatorService.getOrCreate({
          platform,
          username: authorUsername,
          display_name: author,
          avatar_url: authorAvatarUrl,
          profile_url: authorUrl,
          verified: false // Can be enhanced later with verification logic
        });
      } catch (error) {
        console.error('Error creating/updating creator:', error);
        // Continue without creator link if this fails
      }
    }

    // Validate metadata quality
    const extractedMetadata = {
      openGraph: metadata?.openGraph,
      twitterCard: metadata?.twitterCard,
      oEmbed: metadata?.oEmbed,
      jsonLd: metadata?.jsonLd,
      htmlMeta: metadata?.htmlMeta
    };

    const metadataQuality = MetadataValidator.validate(extractedMetadata, {
      title,
      description,
      image: thumbnailUrl,
      author,
      publishedDate: contentCreatedAt
    });

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
      const updateData: any = {
        updated_at: new Date().toISOString(),
        metadata_quality: metadataQuality
      };

      // Update tags if provided
      if (hasTags) updateData.tags = tags;

      // Update channels if provided
      if (hasChannels) {
        updateData.channels = channels;
        updateData.primary_channel = primaryChannel || channels[0] || null;
      }

      // Update optional fields if provided
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (content !== undefined) updateData.content = content;
      if (author !== undefined) updateData.author_name = author;
      if (authorUsername !== undefined) updateData.author_username = authorUsername;
      if (authorUrl !== undefined) updateData.author_url = authorUrl;
      if (authorAvatarUrl !== undefined) updateData.author_avatar_url = authorAvatarUrl;
      if (thumbnailUrl !== undefined) updateData.thumbnail_url = thumbnailUrl;
      if (mediaAssets !== undefined) updateData.media_assets = mediaAssets;
      if (metadata !== undefined) updateData.metadata = metadata;
      if (contentCreatedAt !== undefined) updateData.content_created_at = contentCreatedAt;
      if (authorId !== undefined) updateData.author_id = authorId;

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

      // Update creator quality score if author changed
      if (authorId) {
        CreatorService.updateQualityScore(authorId).catch(err =>
          console.error('Failed to update creator quality score:', err)
        );
      }

      return NextResponse.json({
        success: true,
        data,
        action: 'updated',
        metadata_quality: metadataQuality
      }, { headers: corsHeaders });

    } else {
      // Create new content
      const contentData: any = {
        id,
        platform,
        platform_content_id: platformContentId,
        url,
        tags: hasTags ? tags : [],
        channels: hasChannels ? channels : [],
        primary_channel: hasChannels ? (primaryChannel || channels[0] || null) : null,
        title: title || null,
        description: description || null,
        content: content || null,
        author_name: author || null,
        author_username: authorUsername || null,
        author_url: authorUrl || null,
        author_avatar_url: authorAvatarUrl || null,
        author_id: authorId || null,
        thumbnail_url: thumbnailUrl || null,
        media_assets: mediaAssets || [],
        metadata: metadata || {},
        metadata_quality: metadataQuality,
        content_created_at: contentCreatedAt || null,
        created_at: new Date().toISOString()
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

      // Update creator quality score
      if (authorId) {
        CreatorService.updateQualityScore(authorId).catch(err =>
          console.error('Failed to update creator quality score:', err)
        );
      }

      return NextResponse.json({
        success: true,
        data,
        action: 'created',
        metadata_quality: metadataQuality
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
 * Get all tagged content, optionally filtered by platform
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const platform = searchParams.get('platform');

    let query = supabase
      .from('content')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by platform if specified
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
