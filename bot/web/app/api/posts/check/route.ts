import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * OPTIONS /api/posts/check
 * Handle preflight requests
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/posts/check?tweetId=123456789
 * Check if a post exists in the database and return its tags
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tweetId = searchParams.get('tweetId');

    if (!tweetId) {
      return NextResponse.json(
        { error: 'tweetId parameter is required' },
        { status: 400 }
      );
    }

    // Query the tagged_posts table
    const { data, error } = await supabase
      .from('tagged_posts')
      .select('*')
      .eq('tweet_id', tweetId)
      .single();

    if (error) {
      // If post doesn't exist, return 404 with exists: false
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          exists: false,
          post: null
        }, { headers: corsHeaders });
      }

      console.error('Error checking post:', error);
      return NextResponse.json(
        { error: 'Failed to check post' },
        { status: 500 }
      );
    }

    // Post exists, return it
    return NextResponse.json({
      exists: true,
      post: data
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
