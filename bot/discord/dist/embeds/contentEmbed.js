import { EmbedBuilder } from 'discord.js';
const PLATFORM_COLORS = {
    twitter: 0x1DA1F2,
    youtube: 0xFF0000,
    reddit: 0xFF4500,
    tiktok: 0x000000,
    bluesky: 0x0085FF,
    discord: 0x5865F2,
    default: 0x667EEA,
};
const PLATFORM_ICONS = {
    twitter: 'https://abs.twimg.com/icons/apple-touch-icon-192x192.png',
    youtube: 'https://www.youtube.com/s/desktop/12d6b690/img/favicon_144x144.png',
    reddit: 'https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png',
    tiktok: 'https://www.tiktok.com/favicon.ico',
    bluesky: 'https://bsky.app/static/apple-touch-icon.png',
};
export function buildContentEmbed(content, appUrl) {
    const embed = new EmbedBuilder()
        .setColor(PLATFORM_COLORS[content.platform] || PLATFORM_COLORS.default)
        .setTimestamp();
    // Title (max 256 chars)
    if (content.title) {
        embed.setTitle(content.title.slice(0, 256));
    }
    else {
        const platformName = content.platform.charAt(0).toUpperCase() + content.platform.slice(1);
        embed.setTitle(`New ${platformName} Content`);
    }
    // Description (max 4096 chars)
    if (content.description) {
        embed.setDescription(content.description.slice(0, 4096));
    }
    // Author info (content creator, not submitter)
    if (content.author_name || content.author_username) {
        embed.setAuthor({
            name: content.author_name || content.author_username || 'Unknown',
            iconURL: content.author_avatar_url || PLATFORM_ICONS[content.platform] || undefined,
        });
    }
    // Thumbnail
    if (content.thumbnail_url) {
        embed.setThumbnail(content.thumbnail_url);
    }
    // URL to original content (makes title clickable)
    if (content.url) {
        embed.setURL(content.url);
    }
    // Footer with submitter attribution
    const footerParts = [];
    if (content.submitter_display_name) {
        footerParts.push(`Submitted by ${content.submitter_display_name}`);
    }
    footerParts.push(`Platform: ${content.platform}`);
    embed.setFooter({ text: footerParts.join(' | ') });
    // Fields
    embed.addFields({
        name: 'View in App',
        value: `[Open in 530 Society](${appUrl})`,
        inline: true,
    });
    if (content.url) {
        embed.addFields({
            name: 'Original',
            value: `[View Source](${content.url})`,
            inline: true,
        });
    }
    return embed;
}
