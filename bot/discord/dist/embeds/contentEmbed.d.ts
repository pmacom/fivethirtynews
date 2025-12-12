import { EmbedBuilder } from 'discord.js';
export interface ContentData {
    id: string;
    title: string | null;
    description: string | null;
    url: string;
    thumbnail_url: string | null;
    author_name: string | null;
    author_username: string | null;
    author_avatar_url: string | null;
    platform: string;
    submitter_discord_id: string | null;
    submitter_display_name: string | null;
}
export declare function buildContentEmbed(content: ContentData, appUrl: string): EmbedBuilder;
