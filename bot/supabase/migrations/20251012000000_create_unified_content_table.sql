-- Create unified content table for multi-platform support
-- This replaces the platform-specific tagged_posts table

CREATE TABLE content (
  -- Core identification
  id TEXT PRIMARY KEY, -- Format: "platform:platformContentId"
  platform TEXT NOT NULL,
  platform_content_id TEXT NOT NULL,
  url TEXT NOT NULL,

  -- Content fields
  title TEXT,
  description TEXT,
  content TEXT, -- Full text content

  -- Author information
  author_name TEXT,
  author_username TEXT,
  author_url TEXT,
  author_avatar_url TEXT,

  -- Media
  thumbnail_url TEXT,
  media_assets JSONB DEFAULT '[]'::jsonb, -- [{type, url, width, height, duration, mimeType}]

  -- Platform-specific metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Tagging
  tags JSONB DEFAULT '[]'::jsonb,
  user_id TEXT DEFAULT 'anonymous',

  -- Timestamps
  content_created_at TIMESTAMPTZ, -- When content was created on platform
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(platform, platform_content_id)
);

-- Create indexes for performance
CREATE INDEX idx_content_platform ON content(platform);
CREATE INDEX idx_content_platform_content_id ON content(platform, platform_content_id);
CREATE INDEX idx_content_url ON content(url);
CREATE INDEX idx_content_user_id ON content(user_id);
CREATE INDEX idx_content_tags ON content USING GIN(tags);
CREATE INDEX idx_content_created_at ON content(created_at DESC);
CREATE INDEX idx_content_content_created_at ON content(content_created_at DESC);
CREATE INDEX idx_content_metadata ON content USING GIN(metadata);

-- Enable RLS
ALTER TABLE content ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow public read and write for MVP
CREATE POLICY "Public read content" ON content FOR SELECT USING (true);
CREATE POLICY "Public insert content" ON content FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update content" ON content FOR UPDATE USING (true);
CREATE POLICY "Public delete content" ON content FOR DELETE USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER content_updated_at_trigger
  BEFORE UPDATE ON content
  FOR EACH ROW
  EXECUTE FUNCTION update_content_updated_at();

-- Add comments for documentation
COMMENT ON TABLE content IS 'Unified multi-platform content storage for 530 - supports Twitter, YouTube, Reddit, Bluesky, and more';
COMMENT ON COLUMN content.id IS 'Deterministic ID format: platform:platformContentId (e.g., twitter:1234567890)';
COMMENT ON COLUMN content.platform IS 'Content platform: twitter, youtube, reddit, bluesky, generic, media, text';
COMMENT ON COLUMN content.platform_content_id IS 'Platform-specific ID (e.g., tweet ID, video ID, post ID)';
COMMENT ON COLUMN content.media_assets IS 'Array of media objects: {type, url, width, height, duration, mimeType}';
COMMENT ON COLUMN content.metadata IS 'Platform-specific metadata (engagement metrics, poll data, etc.)';
COMMENT ON COLUMN content.tags IS 'Array of tag slugs applied by users';
