import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * Fetch tweet data from Twitter's syndication API
 * This is the same API used by Twitter's embed feature
 */
async function fetchTweetFromSyndication(tweetId: string): Promise<any | null> {
  try {
    // Twitter syndication API - used by embed widgets
    const url = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en&token=0`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; 530Society/1.0)',
      },
    });

    if (!response.ok) {
      console.error(`Syndication API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching from syndication API:', error);
    return null;
  }
}

/**
 * Alternative: Use react-tweet's API approach
 */
async function fetchTweetAlternative(tweetId: string): Promise<any | null> {
  try {
    // Try the syndication widget API
    const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/x?tweetId=${tweetId}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; 530Society/1.0)',
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

/**
 * POST /api/tweets/fetch
 * Fetch tweet data and store in tweets table
 * Body: { tweetId: string } or { tweetIds: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { tweetId, tweetIds } = body;

    // Support single or batch fetching
    const idsToFetch: string[] = tweetIds || (tweetId ? [tweetId] : []);

    if (idsToFetch.length === 0) {
      return NextResponse.json(
        { success: false, error: 'tweetId or tweetIds required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Limit batch size
    if (idsToFetch.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Maximum 50 tweets per request' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check which tweets already exist
    const { data: existingTweets } = await supabase
      .from('tweets')
      .select('id')
      .in('id', idsToFetch);

    const existingIds = new Set(existingTweets?.map(t => t.id) || []);
    const missingIds = idsToFetch.filter(id => !existingIds.has(id));

    if (missingIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All tweets already exist',
        fetched: 0,
        existing: existingIds.size,
      }, { headers: corsHeaders });
    }

    // Fetch missing tweets with rate limiting
    const results: { id: string; success: boolean; error?: string }[] = [];
    const tweetsToInsert: { id: string; data: any }[] = [];

    for (const id of missingIds) {
      // Add small delay between requests to avoid rate limiting
      if (results.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      const tweetData = await fetchTweetFromSyndication(id);

      if (tweetData) {
        tweetsToInsert.push({ id, data: tweetData });
        results.push({ id, success: true });
      } else {
        results.push({ id, success: false, error: 'Failed to fetch from Twitter' });
      }
    }

    // Batch insert successful fetches
    if (tweetsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('tweets')
        .upsert(
          tweetsToInsert.map(t => ({
            id: t.id,
            data: t.data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })),
          { onConflict: 'id' }
        );

      if (insertError) {
        console.error('Error inserting tweets:', insertError);
        return NextResponse.json(
          { success: false, error: 'Failed to store tweets', details: insertError.message },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      fetched: successCount,
      failed: failCount,
      existing: existingIds.size,
      results,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in tweet fetch:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET /api/tweets/fetch?id=123456789
 * Fetch a single tweet and return data (doesn't store)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tweetId = searchParams.get('id');

  if (!tweetId) {
    return NextResponse.json(
      { success: false, error: 'Tweet ID required' },
      { status: 400, headers: corsHeaders }
    );
  }

  const supabase = await createClient();

  // Check if tweet exists in database
  const { data: existingTweet } = await supabase
    .from('tweets')
    .select('*')
    .eq('id', tweetId)
    .single();

  if (existingTweet) {
    return NextResponse.json({
      success: true,
      source: 'database',
      data: existingTweet,
    }, { headers: corsHeaders });
  }

  // Fetch from Twitter
  const tweetData = await fetchTweetFromSyndication(tweetId);

  if (!tweetData) {
    return NextResponse.json(
      { success: false, error: 'Tweet not found or failed to fetch' },
      { status: 404, headers: corsHeaders }
    );
  }

  return NextResponse.json({
    success: true,
    source: 'twitter',
    data: { id: tweetId, data: tweetData },
  }, { headers: corsHeaders });
}
