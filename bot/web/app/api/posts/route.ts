import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * OPTIONS /api/posts
 * Handle preflight requests
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/posts
 * Create or update a tagged post
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tweetId, tags, tweetText, author, url, thumbnailUrl } = body;

    // Validate required fields
    if (!tweetId || !tags || !Array.isArray(tags)) {
      return NextResponse.json(
        { error: 'tweetId and tags array are required' },
        { status: 400 }
      );
    }

    // Check if post already exists
    const { data: existingPost, error: checkError } = await supabase
      .from('tagged_posts')
      .select('*')
      .eq('tweet_id', tweetId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing post:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing post' },
        { status: 500 }
      );
    }

    if (existingPost) {
      // Update existing post
      const updateData: any = { tags };
      if (thumbnailUrl) {
        updateData.thumbnail_url = thumbnailUrl;
      }

      const { data, error } = await supabase
        .from('tagged_posts')
        .update(updateData)
        .eq('tweet_id', tweetId)
        .select()
        .single();

      if (error) {
        console.error('Error updating post:', error);
        return NextResponse.json(
          { error: 'Failed to update post' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data,
        action: 'updated'
      }, { headers: corsHeaders });
    } else {
      // Create new post
      const postData: any = {
        tweet_id: tweetId,
        tweet_text: tweetText,
        author,
        url,
        tags,
        timestamp: new Date().toISOString()
      };

      if (thumbnailUrl) {
        postData.thumbnail_url = thumbnailUrl;
      }

      const { data, error } = await supabase
        .from('tagged_posts')
        .insert(postData)
        .select()
        .single();

      if (error) {
        console.error('Error creating post:', error);
        return NextResponse.json(
          { error: 'Failed to create post' },
          { status: 500 }
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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/posts?limit=100
 * Get all tagged posts
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const { data, error } = await supabase
      .from('tagged_posts')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching posts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
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
      { status: 500 }
    );
  }
}
