import { NextRequest, NextResponse } from 'next/server';
import { CreatorService } from '@/lib/services/CreatorService';

// CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * OPTIONS /api/creators
 * Handle preflight requests
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/creators?limit=20&platform=youtube&sortBy=content_count&search=query
 * Get creators with optional filtering and sorting
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const platform = searchParams.get('platform') || undefined;
    const sortBy = (searchParams.get('sortBy') as any) || 'content_count';
    const minContentCount = parseInt(searchParams.get('minContentCount') || '1', 10);
    const search = searchParams.get('search');

    let creators;

    if (search) {
      // Search by name/username
      creators = await CreatorService.search(search, { limit, platform });
    } else {
      // Get top creators
      creators = await CreatorService.getTopCreators({
        limit,
        platform,
        minContentCount,
        sortBy
      });
    }

    return NextResponse.json({
      success: true,
      data: creators
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
