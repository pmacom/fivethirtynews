-- Create creators table for tracking content authors/creators
-- Supports cross-platform creator identification and analytics

CREATE TABLE creators (
  -- Core identification
  id TEXT PRIMARY KEY, -- Format: "platform:username"
  platform TEXT NOT NULL,
  username TEXT NOT NULL,

  -- Profile information
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  profile_url TEXT,

  -- Social metrics (captured at discovery)
  follower_count INT,
  verified BOOLEAN DEFAULT false,

  -- Platform-specific metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Analytics
  content_count INT DEFAULT 0,
  avg_quality_score FLOAT,

  -- Timestamps
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(platform, username)
);

-- Create indexes for performance
CREATE INDEX idx_creators_platform ON creators(platform);
CREATE INDEX idx_creators_username ON creators(username);
CREATE INDEX idx_creators_platform_username ON creators(platform, username);
CREATE INDEX idx_creators_content_count ON creators(content_count DESC);
CREATE INDEX idx_creators_avg_quality_score ON creators(avg_quality_score DESC NULLS LAST);
CREATE INDEX idx_creators_last_seen ON creators(last_seen DESC);
CREATE INDEX idx_creators_metadata ON creators USING GIN(metadata);

-- Enable RLS
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow public read and write for MVP
CREATE POLICY "Public read creators" ON creators FOR SELECT USING (true);
CREATE POLICY "Public insert creators" ON creators FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update creators" ON creators FOR UPDATE USING (true);
CREATE POLICY "Public delete creators" ON creators FOR DELETE USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_creators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER creators_updated_at_trigger
  BEFORE UPDATE ON creators
  FOR EACH ROW
  EXECUTE FUNCTION update_creators_updated_at();

-- Function to update creator stats when content is added/removed
CREATE OR REPLACE FUNCTION update_creator_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment content count and update last_seen
    UPDATE creators
    SET
      content_count = content_count + 1,
      last_seen = NOW()
    WHERE id = NEW.author_id;

  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement content count
    UPDATE creators
    SET content_count = GREATEST(0, content_count - 1)
    WHERE id = OLD.author_id;

  ELSIF TG_OP = 'UPDATE' AND OLD.author_id != NEW.author_id THEN
    -- Content reassigned to different creator
    UPDATE creators
    SET content_count = GREATEST(0, content_count - 1)
    WHERE id = OLD.author_id;

    UPDATE creators
    SET
      content_count = content_count + 1,
      last_seen = NOW()
    WHERE id = NEW.author_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE creators IS 'Content creators/authors tracked across platforms for analytics and recommendations';
COMMENT ON COLUMN creators.id IS 'Deterministic ID format: platform:username (e.g., twitter:elonmusk)';
COMMENT ON COLUMN creators.platform IS 'Content platform: twitter, youtube, reddit, bluesky, etc.';
COMMENT ON COLUMN creators.username IS 'Platform-specific username or handle';
COMMENT ON COLUMN creators.content_count IS 'Total number of content items from this creator in our system';
COMMENT ON COLUMN creators.avg_quality_score IS 'Average metadata quality score (0-100) of creator content';
COMMENT ON COLUMN creators.first_seen IS 'When this creator was first discovered in our system';
COMMENT ON COLUMN creators.last_seen IS 'When we last saw content from this creator';
