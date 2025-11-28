import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
 * GET /api/content/check?platform=twitter&contentId=123456
 * Check if content exists in database
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const platform = searchParams.get('platform');
    const contentId = searchParams.get('contentId');

    if (!platform || !contentId) {
      return NextResponse.json(
        { error: 'platform and contentId are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('platform', platform)
      .eq('platform_content_id', contentId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking content:', error);
      return NextResponse.json(
        { error: 'Failed to check content' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      exists: !!data,
      content: data || null
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
