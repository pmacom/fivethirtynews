import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/shows/[slug]/episodes/[id]/blocks
 * Get all content blocks for an episode with their items
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const supabase = await createClient();
    const { slug, id: episodeId } = await params;

    // Verify show exists
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('id')
      .eq('slug', slug)
      .single();

    if (showError || !show) {
      return NextResponse.json(
        { success: false, error: 'Show not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Verify episode exists
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('id')
      .eq('id', episodeId)
      .eq('show_id', show.id)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json(
        { success: false, error: 'Episode not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Fetch content blocks with items
    const { data: blocks, error: blocksError } = await supabase
      .from('content_blocks')
      .select(`
        id,
        title,
        description,
        weight,
        template_id,
        content_block_items (
          id,
          weight,
          news_id,
          content:content!content_block_items_news_id_fkey (
            id,
            platform,
            url,
            title,
            description,
            author_name,
            author_avatar_url,
            thumbnail_url,
            media_assets,
            tags,
            created_at
          )
        )
      `)
      .eq('episode_id', episodeId)
      .order('weight');

    if (blocksError) {
      console.error('Error fetching blocks:', blocksError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch content blocks' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Sort items within each block by weight
    const sortedBlocks = (blocks || []).map(block => ({
      ...block,
      content_block_items: (block.content_block_items || [])
        .sort((a: any, b: any) => a.weight - b.weight)
    }));

    return NextResponse.json(
      { success: true, data: sortedBlocks },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('GET /api/shows/[slug]/episodes/[id]/blocks error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
