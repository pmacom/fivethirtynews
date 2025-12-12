import { Client, EmbedBuilder } from 'discord.js';
declare const client: Client<boolean>;
export interface DiscordMemberInfo {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
    roles: string[];
    joinedAt: string | null;
    isBot: boolean;
}
export declare function sendContentEmbed(channelId: string, embed: EmbedBuilder): Promise<boolean>;
export declare function loginBot(token: string): Promise<void>;
/**
 * Fetch all members from a guild in chunks to reduce memory pressure
 * Returns member info with count for caching comparison
 * Uses server-side cache to prevent Discord rate limiting
 */
export declare function fetchGuildMembers(guildId: string): Promise<{
    members: DiscordMemberInfo[];
    count: number;
    guildName: string;
} | null>;
/**
 * Get just the member count for quick comparison
 * Uses guild.memberCount which is always available from cache
 */
export declare function getGuildMemberCount(guildId: string): Promise<number | null>;
export interface DiscordEmoji {
    id: string;
    name: string;
    url: string;
    animated: boolean;
}
/**
 * Fetch all custom emojis from a guild
 * Returns emoji info with URLs for display
 */
export declare function fetchGuildEmojis(guildId: string): Promise<{
    emojis: DiscordEmoji[];
    guildName: string;
} | null>;
export { client };
