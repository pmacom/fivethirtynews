import { Client, GatewayIntentBits, TextChannel, EmbedBuilder, GuildMember } from 'discord.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers, // Required for fetching member list
  ],
});

export interface DiscordMemberInfo {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  roles: string[];
  joinedAt: string | null;
  isBot: boolean;
}

// Server-side cache to prevent Discord rate limiting
// Cache members for 5 minutes before allowing a refresh
interface MemberCache {
  members: DiscordMemberInfo[];
  count: number;
  guildName: string;
  fetchedAt: number;
}
const memberCache: Map<string, MemberCache> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

client.once('ready', () => {
  console.log(`[Discord] Bot logged in as ${client.user?.tag}`);
  console.log(`[Discord] Connected to ${client.guilds.cache.size} guild(s)`);
});

client.on('error', (error) => {
  console.error('[Discord] Client error:', error);
});

export async function sendContentEmbed(
  channelId: string,
  embed: EmbedBuilder
): Promise<boolean> {
  try {
    const channel = await client.channels.fetch(channelId);

    if (!channel) {
      console.error(`[Discord] Channel ${channelId} not found`);
      return false;
    }

    if (!(channel instanceof TextChannel)) {
      console.error(`[Discord] Channel ${channelId} is not a text channel`);
      return false;
    }

    await channel.send({ embeds: [embed] });
    console.log(`[Discord] Message sent to channel ${channelId} (${channel.name})`);
    return true;
  } catch (error) {
    console.error('[Discord] Failed to send embed:', error);
    return false;
  }
}

export async function loginBot(token: string): Promise<void> {
  await client.login(token);
}

/**
 * Fetch all members from a guild
 * Returns member info with count for caching comparison
 * Uses server-side cache to prevent Discord rate limiting
 */
export async function fetchGuildMembers(guildId: string): Promise<{
  members: DiscordMemberInfo[];
  count: number;
  guildName: string;
} | null> {
  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      console.error(`[Discord] Guild ${guildId} not found in cache`);
      return null;
    }

    // Check server-side cache first
    const cached = memberCache.get(guildId);
    const now = Date.now();
    if (cached && (now - cached.fetchedAt) < CACHE_TTL_MS) {
      console.log(`[Discord] Returning cached members for ${guild.name} (${Math.round((CACHE_TTL_MS - (now - cached.fetchedAt)) / 1000)}s remaining)`);
      return {
        members: cached.members,
        count: cached.count,
        guildName: cached.guildName,
      };
    }

    // Fetch all members (requires GuildMembers intent)
    const members = await guild.members.fetch();
    console.log(`[Discord] Fetched ${members.size} members from ${guild.name}`);

    const memberList: DiscordMemberInfo[] = members
      .filter(member => !member.user.bot) // Exclude bots
      .map(member => ({
        id: member.user.id,
        username: member.user.username,
        displayName: member.displayName || member.user.username,
        avatar: member.user.avatarURL({ size: 128 }),
        roles: member.roles.cache
          .filter(role => role.name !== '@everyone')
          .map(role => role.name),
        joinedAt: member.joinedAt?.toISOString() || null,
        isBot: member.user.bot,
      }));

    // Update server-side cache
    memberCache.set(guildId, {
      members: memberList,
      count: memberList.length,
      guildName: guild.name,
      fetchedAt: now,
    });

    return {
      members: memberList,
      count: memberList.length,
      guildName: guild.name,
    };
  } catch (error) {
    console.error('[Discord] Failed to fetch guild members:', error);
    // Return cached data if available, even if stale
    const cached = memberCache.get(guildId);
    if (cached) {
      console.log(`[Discord] Returning stale cache due to error`);
      return {
        members: cached.members,
        count: cached.count,
        guildName: cached.guildName,
      };
    }
    return null;
  }
}

/**
 * Get just the member count for quick comparison
 * Uses guild.memberCount which is always available from cache
 */
export async function getGuildMemberCount(guildId: string): Promise<number | null> {
  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return null;

    // Use guild.memberCount (includes bots) - this is always available without API call
    // For more accurate non-bot count, check our server-side cache
    const cached = memberCache.get(guildId);
    if (cached) {
      return cached.count;
    }

    // Fallback to approximate count (includes bots)
    return guild.memberCount;
  } catch (error) {
    console.error('[Discord] Failed to get member count:', error);
    return null;
  }
}

// ============================================
// Discord Emoji Functions
// ============================================

export interface DiscordEmoji {
  id: string;
  name: string;
  url: string;
  animated: boolean;
}

// Cache emojis for 10 minutes (they change less frequently than members)
interface EmojiCache {
  emojis: DiscordEmoji[];
  guildName: string;
  fetchedAt: number;
}
const emojiCache: Map<string, EmojiCache> = new Map();
const EMOJI_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Fetch all custom emojis from a guild
 * Returns emoji info with URLs for display
 */
export async function fetchGuildEmojis(guildId: string): Promise<{
  emojis: DiscordEmoji[];
  guildName: string;
} | null> {
  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      console.error(`[Discord] Guild ${guildId} not found in cache`);
      return null;
    }

    // Check cache first
    const cached = emojiCache.get(guildId);
    const now = Date.now();
    if (cached && (now - cached.fetchedAt) < EMOJI_CACHE_TTL_MS) {
      console.log(`[Discord] Returning cached emojis for ${guild.name} (${cached.emojis.length} emojis)`);
      return {
        emojis: cached.emojis,
        guildName: cached.guildName,
      };
    }

    // Emojis are already in cache from guild data, no API call needed
    const emojiList: DiscordEmoji[] = guild.emojis.cache.map(emoji => ({
      id: emoji.id,
      name: emoji.name || 'unknown',
      url: emoji.imageURL({ size: 64 }),
      animated: emoji.animated || false,
    }));

    console.log(`[Discord] Fetched ${emojiList.length} emojis from ${guild.name}`);

    // Update cache
    emojiCache.set(guildId, {
      emojis: emojiList,
      guildName: guild.name,
      fetchedAt: now,
    });

    return {
      emojis: emojiList,
      guildName: guild.name,
    };
  } catch (error) {
    console.error('[Discord] Failed to fetch guild emojis:', error);
    // Return cached data if available
    const cached = emojiCache.get(guildId);
    if (cached) {
      return {
        emojis: cached.emojis,
        guildName: cached.guildName,
      };
    }
    return null;
  }
}

export { client };
