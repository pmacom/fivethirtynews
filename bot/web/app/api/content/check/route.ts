import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * OPTIONS /api/content/check
 * Handle preflight requests
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/content/check?platform=twitter&contentId=1234567890
 * Check if content exists and return its tags
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const platform = searchParams.get('platform');
    const contentId = searchParams.get('contentId');

    // Validate required parameters
    if (!platform || !contentId) {
      return NextResponse.json(
        { error: 'platform and contentId query parameters are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if content exists
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('platform', platform)
      .eq('platform_content_id', contentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Content not found
        return NextResponse.json({
          success: true,
          data: {
            exists: false,
            content: null
          }
        }, { headers: corsHeaders });
      }

      console.error('Error checking content:', error);
      return NextResponse.json(
        { error: 'Failed to check content' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        exists: true,
        content: data
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
