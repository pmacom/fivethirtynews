-- Add unified content columns that were expected by API endpoints
-- These columns align with the bot's unified content schema

-- Add platform column (maps from content_type)
ALTER TABLE content ADD COLUMN IF NOT EXISTS platform TEXT;

-- Add platform_content_id column (maps from content_id)
ALTER TABLE content ADD COLUMN IF NOT EXISTS platform_content_id TEXT;

-- Add url column (maps from content_url)
ALTER TABLE content ADD COLUMN IF NOT EXISTS url TEXT;

-- Add additional unified content columns that may be referenced
ALTER TABLE content ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE content ADD COLUMN IF NOT EXISTS author_name TEXT;
ALTER TABLE content ADD COLUMN IF NOT EXISTS author_username TEXT;
ALTER TABLE content ADD COLUMN IF NOT EXISTS author_url TEXT;
ALTER TABLE content ADD COLUMN IF NOT EXISTS author_avatar_url TEXT;
ALTER TABLE content ADD COLUMN IF NOT EXISTS author_id TEXT;
ALTER TABLE content ADD COLUMN IF NOT EXISTS media_assets JSONB DEFAULT '[]'::jsonb;
ALTER TABLE content ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE content ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE content ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]'::jsonb;

-- Add channel-related columns
ALTER TABLE content ADD COLUMN IF NOT EXISTS channels JSONB DEFAULT '[]'::jsonb;
ALTER TABLE content ADD COLUMN IF NOT EXISTS primary_channel TEXT;

-- Add approval workflow columns
ALTER TABLE content ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending';
ALTER TABLE content ADD COLUMN IF NOT EXISTS submitted_by_user_id UUID;
ALTER TABLE content ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE content ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Backfill data from legacy columns
UPDATE content
SET
  platform = COALESCE(platform, content_type),
  platform_content_id = COALESCE(platform_content_id, content_id),
  url = COALESCE(url, content_url)
WHERE platform IS NULL OR platform_content_id IS NULL OR url IS NULL;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_content_platform ON content(platform);
CREATE INDEX IF NOT EXISTS idx_content_platform_content_id ON content(platform, platform_content_id);
CREATE INDEX IF NOT EXISTS idx_content_url ON content(url);
CREATE INDEX IF NOT EXISTS idx_content_primary_channel ON content(primary_channel);
CREATE INDEX IF NOT EXISTS idx_content_approval_status ON content(approval_status);
CREATE INDEX IF NOT EXISTS idx_content_tags ON content USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_content_channels ON content USING GIN(channels);

-- Add unique constraint for platform + platform_content_id
-- Use a partial index to handle NULLs gracefully
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_platform_unique
ON content(platform, platform_content_id)
WHERE platform IS NOT NULL AND platform_content_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN content.platform IS 'Content platform: twitter, youtube, reddit, bluesky, generic, media, text';
COMMENT ON COLUMN content.platform_content_id IS 'Platform-specific ID (e.g., tweet ID, video ID, post ID)';
COMMENT ON COLUMN content.approval_status IS 'Content approval status: pending, approved, rejected';
