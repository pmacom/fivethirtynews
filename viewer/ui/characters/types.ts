export interface ProfileLink {
  label: string;
  url: string;
}

export interface CharacterShow {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export interface Character {
  id: string;
  display_name: string;
  discord_avatar: string | null;
  bio: string | null;
  background_image_url: string | null;
  profile_links: ProfileLink[];
  is_admin: boolean;
  is_moderator: boolean;
  shows: CharacterShow[];
}

/**
 * Get the role badge text for a character
 */
export function getCharacterRole(character: Character): string {
  if (character.is_admin) return 'ADMIN';
  if (character.is_moderator) return 'MOD';
  if (character.shows.length > 0) return 'HOST';
  return 'MEMBER';
}

/**
 * Get the role color class for a character
 */
export function getCharacterRoleColor(character: Character): string {
  if (character.is_admin) return 'text-red-400';
  if (character.is_moderator) return 'text-purple-400';
  if (character.shows.length > 0) return 'text-cyan-400';
  return 'text-gray-400';
}

/**
 * Get avatar URL with fallback
 */
export function getAvatarUrl(character: Character): string {
  if (character.discord_avatar) {
    if (character.discord_avatar.startsWith('http')) {
      return character.discord_avatar;
    }
    // Construct Discord CDN URL
    return `https://cdn.discordapp.com/avatars/${character.id}/${character.discord_avatar}.png`;
  }
  // Default Discord avatar
  return 'https://cdn.discordapp.com/embed/avatars/0.png';
}
