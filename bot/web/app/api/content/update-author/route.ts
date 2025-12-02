import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { contentId, authorData } = body

    if (!contentId || !authorData) {
      return NextResponse.json(
        { error: 'Missing contentId or authorData' },
        { status: 400 }
      )
    }

    const { username, displayName, avatarUrl, verified } = authorData

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required in authorData' },
        { status: 400 }
      )
    }

    // Create or update creator
    const creatorId = `twitter:${username}`
    const { error: creatorError } = await supabase
      .from('creators')
      .upsert(
        {
          id: creatorId,
          platform: 'twitter',
          username: username,
          display_name: displayName || username,
          avatar_url: avatarUrl || null,
          verified: verified || false,
          metadata: {
            source: 'embed_scraper',
            scraped_at: new Date().toISOString()
          }
        },
        {
          onConflict: 'platform,username',
          ignoreDuplicates: false
        }
      )

    if (creatorError) {
      console.error('Error upserting creator:', creatorError)
      return NextResponse.json(
        { error: `Failed to upsert creator: ${creatorError.message}` },
        { status: 500 }
      )
    }

    // Update content with author information
    const { error: contentError } = await supabase
      .from('content')
      .update({
        author_id: creatorId,
        author_username: username,
        author_name: displayName || username,
        author_avatar_url: avatarUrl || null,
        author_url: `https://twitter.com/${username}`
      })
      .eq('id', contentId)

    if (contentError) {
      console.error('Error updating content:', contentError)
      return NextResponse.json(
        { error: `Failed to update content: ${contentError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      creatorId,
      contentId
    })
  } catch (error: any) {
    console.error('Error in update-author API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
