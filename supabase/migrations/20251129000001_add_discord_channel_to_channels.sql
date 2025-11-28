-- Add Discord channel mapping to channels table
ALTER TABLE channels
  ADD COLUMN IF NOT EXISTS discord_channel_id TEXT;

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_channels_discord_channel_id
  ON channels(discord_channel_id) WHERE discord_channel_id IS NOT NULL;

COMMENT ON COLUMN channels.discord_channel_id IS 'Discord channel ID for broadcasting content';
