import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * POST /api/content/[id]/approve - Approve content
 * POST /api/content/[id]/approve?action=reject - Reject content
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('530_session')?.value;

  // Also check Authorization header for extension/API clients
  const authHeader = request.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
  const token = sessionToken || bearerToken;

  const action = request.nextUrl.searchParams.get('action') || 'approve';

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const supabase = await createClient();

    // Verify user is admin or moderator
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, is_admin, is_moderator')
      .eq('session_token', token)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401, headers: corsHeaders }
      );
    }

    if (!user.is_admin && !user.is_moderator) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - moderator or admin role required' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Get optional reason from body
    const body = await request.json().catch(() => ({}));

    // Update content approval status
    const { data, error } = await supabase
      .from('content')
      .update({
        approval_status: action === 'reject' ? 'rejected' : 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        approval_reason: body.reason || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating content approval:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update content' },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Content not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Fire-and-forget broadcast to Discord (only on approval, not rejection)
    if (action !== 'reject') {
      broadcastToDiscord(data, supabase).catch((err) => {
        console.error('[Broadcast] Failed to broadcast to Discord:', err);
      });
    }

    return NextResponse.json({
      success: true,
      status: action === 'reject' ? 'rejected' : 'approved',
      data
    }, { headers: corsHeaders });

  } catch (err) {
    console.error('Approval error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// Helper function to broadcast approved content to Discord
interface ContentRecord {
  id: string;
  title: string | null;
  description: string | null;
  url?: string;
  content_url?: string;
  thumbnail_url: string | null;
  author_name: string | null;
  author_username: string | null;
  author_avatar_url: string | null;
  platform: string;
  primary_channel: string | null;
  submitted_by_user_id: string | null;
}

async function broadcastToDiscord(
  content: ContentRecord,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  // Check if broadcast is enabled
  const { data: setting } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'broadcast_on_approval')
    .single();

  // Default to disabled if setting doesn't exist or is false
  if (!setting?.value || setting.value !== true) {
    console.log('[Broadcast] Skipped - broadcast_on_approval is disabled');
    return;
  }

  // Check if content has a primary channel
  if (!content.primary_channel) {
    console.log('[Broadcast] Skipped - no primary_channel set on content');
    return;
  }

  // Get Discord channel ID for the content's primary channel
  const { data: channel } = await supabase
    .from('channels')
    .select('discord_channel_id')
    .eq('slug', content.primary_channel)
    .single();

  if (!channel?.discord_channel_id) {
    console.log(`[Broadcast] Skipped - no discord_channel_id for channel "${content.primary_channel}"`);
    return;
  }

  // Get submitter info for attribution
  let submitterInfo: { discord_id: string; display_name: string } | null = null;
  if (content.submitted_by_user_id) {
    const { data: submitter } = await supabase
      .from('users')
      .select('discord_id, display_name')
      .eq('id', content.submitted_by_user_id)
      .single();
    submitterInfo = submitter;
  }

  // Call bot HTTP endpoint
  const botUrl = process.env.BOT_URL || 'http://localhost:3001';
  const botSecret = process.env.BOT_API_SECRET;

  if (!botSecret) {
    console.error('[Broadcast] BOT_API_SECRET not configured');
    return;
  }

  const response = await fetch(`${botUrl}/broadcast`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${botSecret}`,
    },
    body: JSON.stringify({
      content: {
        id: content.id,
        title: content.title,
        description: content.description,
        url: content.url || content.content_url,
        thumbnail_url: content.thumbnail_url,
        author_name: content.author_name,
        author_username: content.author_username,
        author_avatar_url: content.author_avatar_url,
        platform: content.platform,
        submitter_discord_id: submitterInfo?.discord_id || null,
        submitter_display_name: submitterInfo?.display_name || null,
      },
      discordChannelId: channel.discord_channel_id,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Bot returned ${response.status}: ${error}`);
  }

  console.log(`[Broadcast] Successfully sent to Discord channel ${channel.discord_channel_id}`);
}
