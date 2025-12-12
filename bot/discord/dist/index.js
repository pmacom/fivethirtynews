import 'dotenv/config';
import { loginBot } from './client.js';
import { startServer } from './server.js';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const BOT_HTTP_PORT = parseInt(process.env.BOT_HTTP_PORT || '3001', 10);
async function main() {
    console.log('[Bot] Starting 530 Discord Bot...');
    // Log env var status (not values) for debugging
    const envStatus = {
        DISCORD_BOT_TOKEN: !!process.env.DISCORD_BOT_TOKEN,
        BOT_API_SECRET: !!process.env.BOT_API_SECRET,
        DISCORD_GUILD_ID: !!process.env.DISCORD_GUILD_ID,
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        BOT_HTTP_PORT: process.env.BOT_HTTP_PORT || '3001 (default)',
        APP_URL: process.env.APP_URL || 'not set',
    };
    console.log('[Bot] Environment status:', envStatus);
    // Validate required environment variables
    if (!BOT_TOKEN) {
        console.error('[Bot] DISCORD_BOT_TOKEN is required');
        console.error('[Bot] Please copy .env.example to .env and configure it');
        process.exit(1);
    }
    if (!process.env.BOT_API_SECRET) {
        console.error('[Bot] BOT_API_SECRET is required');
        process.exit(1);
    }
    // Start HTTP server for receiving notifications from Next.js
    startServer(BOT_HTTP_PORT);
    // Connect to Discord
    try {
        await loginBot(BOT_TOKEN);
        console.log('[Bot] Successfully connected to Discord');
    }
    catch (error) {
        console.error('[Bot] Failed to connect to Discord:', error);
        process.exit(1);
    }
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('[Bot] Shutting down...');
        process.exit(0);
    });
    process.on('SIGTERM', () => {
        console.log('[Bot] Shutting down...');
        process.exit(0);
    });
}
main().catch((error) => {
    console.error('[Bot] Fatal error:', error);
    process.exit(1);
});
