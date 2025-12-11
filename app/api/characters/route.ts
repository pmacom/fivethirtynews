import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

interface ShowMembership {
  role: string;
  shows: {
    id: string;
    name: string;
    slug: string;
  };
}

interface CharacterRow {
  id: string;
  display_name: string;
  discord_avatar: string | null;
  bio: string | null;
  background_image_url: string | null;
  profile_links: { label: string; url: string }[] | null;
  is_admin: boolean;
  is_moderator: boolean;
  show_members: ShowMembership[];
}

/**
 * GET /api/characters
 * Returns users who are moderators, admins, or have show roles (showrunner, cohost, producer)
 * Public endpoint - no authentication required
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Query users with their show memberships
    // We need users who are: admins, moderators, or have show roles
    // Note: Use show_members!user_id to specify the foreign key relationship
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        display_name,
        discord_avatar,
        bio,
        background_image_url,
        profile_links,
        is_admin,
        is_moderator,
        show_members!user_id (
          role,
          shows!show_id (
            id,
            name,
            slug
          )
        )
      `)
      .or('is_admin.eq.true,is_moderator.eq.true')
      .order('display_name');

    if (error) {
      console.error('Error fetching characters:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch characters' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Also get users who have show roles but aren't mods/admins
    const { data: showHosts, error: showHostsError } = await supabase
      .from('show_members')
      .select(`
        role,
        users!user_id (
          id,
          display_name,
          discord_avatar,
          bio,
          background_image_url,
          profile_links,
          is_admin,
          is_moderator
        ),
        shows!show_id (
          id,
          name,
          slug
        )
      `)
      .in('role', ['showrunner', 'cohost', 'producer']);

    if (showHostsError) {
      console.error('Error fetching show hosts:', showHostsError);
    }

    // Merge and deduplicate users
    const userMap = new Map<string, CharacterRow>();

    // Add mods/admins first
    for (const user of (users || []) as CharacterRow[]) {
      userMap.set(user.id, {
        ...user,
        show_members: user.show_members || [],
      });
    }

    // Add show hosts (may overlap with mods/admins)
    interface ShowHostRow {
      role: string;
      users: {
        id: string;
        display_name: string;
        discord_avatar: string | null;
        bio: string | null;
        background_image_url: string | null;
        profile_links: { label: string; url: string }[] | null;
        is_admin: boolean;
        is_moderator: boolean;
      };
      shows: {
        id: string;
        name: string;
        slug: string;
      };
    }

    for (const membership of (showHosts || []) as ShowHostRow[]) {
      const userId = membership.users.id;
      const existing = userMap.get(userId);

      if (existing) {
        // Add show membership to existing user
        const showMembership: ShowMembership = {
          role: membership.role,
          shows: membership.shows,
        };
        if (!existing.show_members.some(sm => sm.shows.id === membership.shows.id)) {
          existing.show_members.push(showMembership);
        }
      } else {
        // New user from show hosts
        userMap.set(userId, {
          id: membership.users.id,
          display_name: membership.users.display_name,
          discord_avatar: membership.users.discord_avatar,
          bio: membership.users.bio,
          background_image_url: membership.users.background_image_url,
          profile_links: membership.users.profile_links,
          is_admin: membership.users.is_admin,
          is_moderator: membership.users.is_moderator,
          show_members: [{
            role: membership.role,
            shows: membership.shows,
          }],
        });
      }
    }

    // Convert to array and format for response
    const characters = Array.from(userMap.values()).map(user => ({
      id: user.id,
      display_name: user.display_name,
      discord_avatar: user.discord_avatar,
      bio: user.bio,
      background_image_url: user.background_image_url,
      profile_links: user.profile_links || [],
      is_admin: user.is_admin,
      is_moderator: user.is_moderator,
      shows: user.show_members
        .filter(sm => ['showrunner', 'cohost', 'producer'].includes(sm.role))
        .map(sm => ({
          id: sm.shows.id,
          name: sm.shows.name,
          slug: sm.shows.slug,
          role: sm.role,
        })),
    }));

    // Sort: admins first, then mods, then show hosts, alphabetically within each
    characters.sort((a, b) => {
      const weightA = a.is_admin ? 0 : a.is_moderator ? 1 : 2;
      const weightB = b.is_admin ? 0 : b.is_moderator ? 1 : 2;

      if (weightA !== weightB) {
        return weightA - weightB;
      }

      return (a.display_name || '').localeCompare(b.display_name || '');
    });

    return NextResponse.json(
      { success: true, data: characters },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('GET /api/characters error:', err);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
