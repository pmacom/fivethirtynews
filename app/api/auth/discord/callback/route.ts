import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { randomUUID } from 'crypto';

// Discord OAuth callback endpoint
// GET /api/auth/discord/callback?code=...&state=...

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/auth/discord/callback';
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || '1031322428288278539';

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  global_name: string | null;
}

interface DiscordGuild {
  id: string;
  name: string;
}

interface DiscordGuildMember {
  roles: string[];
  nick: string | null;
  joined_at: string;
}

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

// Generate a simple session token
function generateSessionToken(): string {
  return `530_${randomUUID().replace(/-/g, '')}${Date.now().toString(36)}`;
}

// Exchange code for tokens
async function exchangeCodeForTokens(code: string): Promise<DiscordTokenResponse> {
  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: DISCORD_CLIENT_ID!,
      client_secret: DISCORD_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      code,
      redirect_uri: DISCORD_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  return response.json();
}

// Fetch Discord user info
async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const response = await fetch('https://discord.com/api/users/@me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Discord user');
  }

  return response.json();
}

// Check if user is member of the required guild
async function checkGuildMembership(accessToken: string): Promise<boolean> {
  const response = await fetch('https://discord.com/api/users/@me/guilds', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user guilds');
  }

  const guilds: DiscordGuild[] = await response.json();
  return guilds.some((guild) => guild.id === DISCORD_GUILD_ID);
}

// Fetch user's guild member info including roles
async function fetchGuildMember(accessToken: string): Promise<DiscordGuildMember | null> {
  const response = await fetch(
    `https://discord.com/api/users/@me/guilds/${DISCORD_GUILD_ID}/member`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    // User might not be a member
    if (response.status === 404) return null;
    console.error('Failed to fetch guild member:', await response.text());
    return null;
  }

  return response.json();
}

// Role IDs in 530 Society Discord - configured via env vars
const ADMIN_ROLE_IDS = process.env.DISCORD_ADMIN_ROLE_IDS?.split(',') || [];
const MODERATOR_ROLE_IDS = process.env.DISCORD_MODERATOR_ROLE_IDS?.split(',') || [];

// Check if user has admin permissions based on roles
function checkAdminStatus(roles: string[]): boolean {
  if (ADMIN_ROLE_IDS.length > 0) {
    return roles.some((role) => ADMIN_ROLE_IDS.includes(role));
  }
  return false;
}

// Check if user has moderator permissions based on roles
function checkModeratorStatus(roles: string[]): boolean {
  if (MODERATOR_ROLE_IDS.length > 0) {
    return roles.some((role) => MODERATOR_ROLE_IDS.includes(role));
  }
  return false;
}

// Build Discord avatar URL
function getAvatarUrl(userId: string, avatarHash: string | null): string | null {
  if (!avatarHash) return null;
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png`;
}

// Return HTML page that sends data back to extension
function createCallbackHtml(success: boolean, data?: any, error?: string): string {
  const payload = success
    ? { success: true, ...data }
    : { success: false, error };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>530 Extension - ${success ? 'Login Successful' : 'Login Failed'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #18181b;
      color: #e4e4e7;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
    }
    .container {
      text-align: center;
      padding: 40px;
      background: #27272a;
      border-radius: 12px;
      max-width: 400px;
    }
    h1 { color: ${success ? '#10b981' : '#ef4444'}; margin-bottom: 16px; }
    p { color: #a1a1aa; margin-bottom: 24px; }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
    }
    .btn:hover { background: #5a67d8; }
    .discord-btn {
      background: #5865f2;
    }
    .discord-btn:hover { background: #4752c4; }
  </style>
</head>
<body>
  <div class="container">
    ${
      success
        ? `
      <h1 style="color: #10b981;">Login Successful</h1>
      <p>Welcome, <strong>${data.user.display_name}</strong>!</p>
      <p style="font-size: 13px; color: #71717a; margin-top: 16px;">This window will close automatically...</p>
      <p style="font-size: 12px; color: #52525b;">If it doesn't close, you can safely close it manually.</p>
    `
        : `
      <h1 style="color: #ef4444;">Login Failed</h1>
      <p>${error}</p>
      ${
        error?.includes('not a member')
          ? `
        <a href="https://discord.gg/530society" target="_blank" class="btn discord-btn">
          Join 530 Society Discord
        </a>
        <p style="margin-top: 16px; font-size: 12px;">After joining, try logging in again.</p>
      `
          : `
        <button onclick="window.close()" class="btn">Close</button>
      `
      }
    `
    }
  </div>
  <script>
    const payload = ${JSON.stringify(payload)};

    // Store in URL hash for chrome.identity.launchWebAuthFlow to read
    window.location.hash = encodeURIComponent(JSON.stringify(payload));

    // Try to send message to extension opener
    if (window.opener) {
      window.opener.postMessage(payload, '*');
    }

    // Auto-close window after success
    ${
      success
        ? `
    // Try multiple close methods
    setTimeout(() => {
      try { window.close(); } catch(e) {}
    }, 1500);

    // Fallback: show manual close message if still open after 3s
    setTimeout(() => {
      document.body.innerHTML += '<p style="text-align:center;color:#71717a;font-size:12px;margin-top:20px;">Window not closing? You can close it manually.</p>';
    }, 3000);
    `
        : ''
    }
  </script>
</body>
</html>
`;
}

// Parse state to determine if this is a web login
function parseState(state: string | null): { isWebLogin: boolean; extensionId: string | null } {
  if (!state) return { isWebLogin: false, extensionId: null };
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
    return {
      isWebLogin: decoded.isWebLogin === true,
      extensionId: decoded.extensionId || null,
    };
  } catch {
    return { isWebLogin: false, extensionId: null };
  }
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const error = request.nextUrl.searchParams.get('error');
  const { isWebLogin } = parseState(state);

  // If no code and no error, this is likely the hash redirect - return minimal response
  // The hash fragment is handled client-side and captured by launchWebAuthFlow
  if (!code && !error) {
    return new NextResponse(
      `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  // Handle OAuth errors
  if (error) {
    return new NextResponse(createCallbackHtml(false, undefined, `Discord OAuth error: ${error}`), {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  // Check configuration
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    return new NextResponse(createCallbackHtml(false, undefined, 'Discord OAuth not configured'), {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  // Ensure code is present
  if (!code) {
    return new NextResponse(createCallbackHtml(false, undefined, 'Missing authorization code'), {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  try {
    // 1. Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // 2. Fetch Discord user info
    const discordUser = await fetchDiscordUser(tokens.access_token);

    // 3. Fetch guild member info (includes membership check and roles)
    const guildMember = await fetchGuildMember(tokens.access_token);

    if (!guildMember) {
      return new NextResponse(
        createCallbackHtml(
          false,
          undefined,
          'You are not a member of the 530 Society Discord server. Please join first!'
        ),
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // 4. Check admin and moderator status (hierarchical: admin implies moderator)
    const isAdmin = checkAdminStatus(guildMember.roles);
    const isModerator = isAdmin || checkModeratorStatus(guildMember.roles);

    // 5. Create or update user in database
    console.log('[Discord Auth] Starting database operation for user:', discordUser.id);
    console.log('[Discord Auth] Supabase URL configured:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('[Discord Auth] Supabase Key configured:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const supabase = await createClient();
    const sessionToken = generateSessionToken();
    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const userData = {
      discord_id: discordUser.id,
      discord_username: discordUser.username,
      discord_avatar: getAvatarUrl(discordUser.id, discordUser.avatar),
      display_name: guildMember.nick || discordUser.global_name || discordUser.username,
      is_guild_member: true,
      is_admin: isAdmin,
      is_moderator: isModerator,
      discord_roles: guildMember.roles,
      session_token: sessionToken,
      session_expires_at: sessionExpiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Upsert user
    const { data: user, error: dbError } = await supabase
      .from('users')
      .upsert(userData, { onConflict: 'discord_id' })
      .select()
      .single();

    if (dbError) {
      console.error('[Discord Auth] Database error:', JSON.stringify(dbError, null, 2));
      console.error('[Discord Auth] Failed userData:', JSON.stringify(userData, null, 2));
      return new NextResponse(createCallbackHtml(false, undefined, 'Failed to save user data'), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    console.log('[Discord Auth] User saved successfully:', user?.id);

    // 6. Build the response payload
    const responsePayload = {
      success: true,
      token: sessionToken,
      expiresAt: sessionExpiresAt.getTime(),
      user: {
        id: user.id,
        discord_id: discordUser.id,
        display_name: userData.display_name,
        avatar: userData.discord_avatar,
        is_admin: isAdmin,
        is_moderator: isModerator,
      },
    };

    // Handle web login: set cookie and redirect to homepage
    if (isWebLogin) {
      const response = NextResponse.redirect(new URL('/', request.url));

      // Set session cookie (HttpOnly for security)
      response.cookies.set('530_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        expires: sessionExpiresAt,
      });

      // Also set user info cookie (not HttpOnly so JS can read it)
      response.cookies.set('530_user', JSON.stringify({
        id: user.id,
        discord_id: discordUser.id,
        display_name: userData.display_name,
        avatar: userData.discord_avatar,
        is_admin: isAdmin,
        is_moderator: isModerator,
      }), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        expires: sessionExpiresAt,
      });

      return response;
    }

    // Extension flow: Return page that sets hash for launchWebAuthFlow
    const encodedPayload = encodeURIComponent(JSON.stringify(responsePayload));
    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>530 - Login Successful</title>
</head>
<body>
<script>
// Set the hash with auth data - this is what launchWebAuthFlow reads
window.location.replace(window.location.pathname + '#' + '${encodedPayload}');
</script>
</body>
</html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (err) {
    console.error('OAuth callback error:', err);
    return new NextResponse(
      createCallbackHtml(false, undefined, err instanceof Error ? err.message : 'Authentication failed'),
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}
