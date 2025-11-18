import { NextRequest, NextResponse } from 'next/server'

// Gray 1x1 pixel PNG as broken image placeholder
const BROKEN_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg=='

function returnBrokenImage(reason: string) {
  console.warn('[Proxy] Returning broken image placeholder:', reason)
  const imageBuffer = Buffer.from(BROKEN_IMAGE_BASE64, 'base64')
  return new NextResponse(imageBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')

    if (!imageUrl) {
      return returnBrokenImage('No URL provided')
    }

    // Only allow Twitter image URLs for security
    if (!imageUrl.includes('pbs.twimg.com')) {
      return returnBrokenImage('Only Twitter images are allowed')
    }

    // Fetch the image with proper headers
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://twitter.com/',
      },
    })

    if (!response.ok) {
      return returnBrokenImage(`Failed to fetch: ${response.status} ${response.statusText}`)
    }

    // Get the image buffer
    const imageBuffer = await response.arrayBuffer()

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('[Proxy] Image proxy error:', error)
    return returnBrokenImage(`Exception: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

