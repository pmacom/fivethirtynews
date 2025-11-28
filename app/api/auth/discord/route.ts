import { NextRequest, NextResponse } from 'next/server';

// Discord OAuth initiation endpoint
// GET /api/auth/discord?extension_id=<chrome-extension-id>
// GET /api/auth/discord?web=true (for web app login)

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/auth/discord/callback';

export async function GET(request: NextRequest) {
  // Check if this is a web app login or extension login
  const isWebLogin = request.nextUrl.searchParams.get('web') === 'true';
  const extensionId = request.nextUrl.searchParams.get('extension_id');

  if (!DISCORD_CLIENT_ID) {
    return NextResponse.json(
      { success: false, error: 'Discord OAuth not configured' },
      { status: 500 }
    );
  }

  // Generate state token to prevent CSRF and pass flow info
  const state = Buffer.from(
    JSON.stringify({
      extensionId,
      isWebLogin,
      timestamp: Date.now(),
    })
  ).toString('base64');

  // Build Discord OAuth URL
  const discordAuthUrl = new URL('https://discord.com/oauth2/authorize');
  discordAuthUrl.searchParams.set('client_id', DISCORD_CLIENT_ID);
  discordAuthUrl.searchParams.set('redirect_uri', DISCORD_REDIRECT_URI);
  discordAuthUrl.searchParams.set('response_type', 'code');
  discordAuthUrl.searchParams.set('scope', 'identify guilds guilds.members.read');
  discordAuthUrl.searchParams.set('state', state);

  // Redirect to Discord
  return NextResponse.redirect(discordAuthUrl.toString());
}

// Handle preflight for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
