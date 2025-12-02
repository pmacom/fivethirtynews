import express, { Request, Response, NextFunction } from 'express';
import { sendContentEmbed, fetchGuildMembers, getGuildMemberCount, fetchGuildEmojis } from './client.js';
import { buildContentEmbed, ContentData } from './embeds/contentEmbed.js';

const app = express();
app.use(express.json());

const BOT_API_SECRET = process.env.BOT_API_SECRET;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Middleware to verify API secret
function verifySecret(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!BOT_API_SECRET) {
    console.error('[Server] BOT_API_SECRET not configured');
    res.status(500).json({ error: 'Server not configured' });
    return;
  }

  if (!authHeader || authHeader !== `Bearer ${BOT_API_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}

interface BroadcastRequest {
  content: ContentData;
  discordChannelId: string;
}

// POST /broadcast - Receive content approval notification
app.post('/broadcast', verifySecret, async (req: Request, res: Response) => {
  try {
    const { content, discordChannelId } = req.body as BroadcastRequest;

    if (!content) {
      res.status(400).json({ error: 'Missing content' });
      return;
    }

    if (!discordChannelId) {
      res.status(400).json({ error: 'Missing discordChannelId' });
      return;
    }

    console.log(`[Server] Broadcasting content ${content.id} to channel ${discordChannelId}`);

    const embed = buildContentEmbed(content, APP_URL);
    const success = await sendContentEmbed(discordChannelId, embed);

    if (success) {
      res.json({ success: true, message: 'Broadcast sent' });
    } else {
      res.status(500).json({ error: 'Failed to send message to Discord' });
    }
  } catch (error) {
    console.error('[Server] Broadcast error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: '530-discord-bot'
  });
});

// GET /members/:guildId - Fetch all members from a guild
app.get('/members/:guildId', verifySecret, async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;

    if (!guildId) {
      res.status(400).json({ error: 'Missing guildId' });
      return;
    }

    console.log(`[Server] Fetching members for guild ${guildId}`);

    const result = await fetchGuildMembers(guildId);

    if (!result) {
      res.status(404).json({ error: 'Guild not found or bot not in guild' });
      return;
    }

    res.json({
      success: true,
      data: result.members,
      count: result.count,
      guildName: result.guildName,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Server] Members fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /members/:guildId/count - Get just the member count (for cache validation)
app.get('/members/:guildId/count', verifySecret, async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;

    if (!guildId) {
      res.status(400).json({ error: 'Missing guildId' });
      return;
    }

    const count = await getGuildMemberCount(guildId);

    if (count === null) {
      res.status(404).json({ error: 'Guild not found' });
      return;
    }

    res.json({
      success: true,
      count,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Server] Member count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /emojis/:guildId - Fetch all custom emojis from a guild
app.get('/emojis/:guildId', verifySecret, async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;

    if (!guildId) {
      res.status(400).json({ error: 'Missing guildId' });
      return;
    }

    console.log(`[Server] Fetching emojis for guild ${guildId}`);

    const result = await fetchGuildEmojis(guildId);

    if (!result) {
      res.status(404).json({ error: 'Guild not found or bot not in guild' });
      return;
    }

    res.json({
      success: true,
      data: result.emojis,
      count: result.emojis.length,
      guildName: result.guildName,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Server] Emojis fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export function startServer(port: number): void {
  app.listen(port, () => {
    console.log(`[Server] Bot HTTP server listening on port ${port}`);
  });
}
