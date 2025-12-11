export interface ShowMember {
  id: string;
  user_id: string;
  role: 'showrunner' | 'cohost' | 'producer' | 'moderator' | 'guest';
  display_order: number;
  users: {
    id: string;
    display_name: string;
    discord_avatar: string | null;
  };
}

export interface Show {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  schedule_frequency: string | null;
  schedule_day_of_week: number | null;
  schedule_time: string | null;
  schedule_timezone: string | null;
  schedule_text: string | null;
  duration_minutes: number | null;
  status: 'active' | 'hiatus' | 'archived';
  show_members: ShowMember[];
  created_at: string;
}

/**
 * Get status badge text for a show
 */
export function getShowStatus(show: Show): string {
  if (show.status === 'hiatus') return 'ON HIATUS';
  if (show.status === 'archived') return 'ARCHIVED';
  return 'ACTIVE';
}

/**
 * Get status color class for a show
 */
export function getShowStatusColor(show: Show): string {
  if (show.status === 'hiatus') return 'text-yellow-400';
  if (show.status === 'archived') return 'text-gray-400';
  return 'text-green-400';
}

/**
 * Get schedule display text
 */
export function getScheduleDisplay(show: Show): string {
  if (show.schedule_text) return show.schedule_text;

  if (show.schedule_frequency && show.schedule_day_of_week !== null) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day = days[show.schedule_day_of_week];
    const time = show.schedule_time ? ` at ${show.schedule_time}` : '';
    return `${show.schedule_frequency === 'weekly' ? 'Every' : 'Bi-weekly'} ${day}${time}`;
  }

  return 'Schedule TBD';
}

/**
 * Get hosts display (showrunners and cohosts)
 */
export function getShowHosts(show: Show): ShowMember[] {
  return show.show_members
    .filter(m => m.role === 'showrunner' || m.role === 'cohost')
    .sort((a, b) => a.display_order - b.display_order);
}

/**
 * Get show image URL with fallback
 */
export function getShowImageUrl(show: Show): string | null {
  return show.image_url;
}

/**
 * Get avatar URL for a show member
 */
export function getMemberAvatarUrl(member: ShowMember): string {
  if (member.users.discord_avatar) {
    if (member.users.discord_avatar.startsWith('http')) {
      return member.users.discord_avatar;
    }
    return `https://cdn.discordapp.com/avatars/${member.users.id}/${member.users.discord_avatar}.png`;
  }
  return 'https://cdn.discordapp.com/embed/avatars/0.png';
}
