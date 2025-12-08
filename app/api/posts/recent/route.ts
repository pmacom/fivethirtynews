import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Recent posts API
// GET /api/posts/recent - Get recent content items

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET(request: NextRequest) {
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');

  try {
    const supabase = await createClient();

    // Fetch recent content with channel info
    const { data: content, error } = await supabase
      .from('content')
      .select(
        `
        id,
        platform,
        platform_content_id,
        url,
        title,
        description,
        author_name,
        primary_channel,
        created_at
      `
      )
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 50));

    if (error) {
      console.error('Error fetching recent posts:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch posts' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: content || [],
        count: content?.length || 0,
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('GET recent posts error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
