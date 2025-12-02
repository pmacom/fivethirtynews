import { NextRequest, NextResponse } from 'next/server';
import { CreatorService } from '@/lib/services/CreatorService';

// CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * OPTIONS /api/creators/[id]
 * Handle preflight requests
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/creators/[id]
 * Get creator by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const creator = await CreatorService.getById(params.id);

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      data: creator
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
