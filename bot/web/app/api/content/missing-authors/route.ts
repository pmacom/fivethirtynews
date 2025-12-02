import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')

    // Get tweets without author information (checking both null and empty author_id)
    const { data: tweets, error } = await supabase
      .from('content')
      .select('id, platform_content_id, url, content, author_name, author_id')
      .eq('platform', 'twitter')
      .or('author_id.is.null,author_name.is.null')
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Error fetching missing authors:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      tweets: tweets || [],
      count: tweets?.length || 0
    })
  } catch (error: any) {
    console.error('Error in missing-authors API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
