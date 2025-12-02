-- Create content_comments table for saving interesting comments from social media posts
-- This allows users to capture and attach valuable comments/discussions to their curated content

CREATE TABLE content_comments (
  -- Core identification
  id TEXT PRIMARY KEY, -- Format: "platform:commentId"
  content_id TEXT NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_comment_id TEXT NOT NULL,

  -- Comment content
  comment_text TEXT NOT NULL,
  comment_url TEXT,

  -- Author information
  author_name TEXT,
  author_username TEXT,
  author_avatar_url TEXT,
  author_url TEXT,

  -- Engagement metrics
  likes_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  is_author_verified BOOLEAN DEFAULT false,

  -- Thread context
  position_in_thread INTEGER DEFAULT 0, -- 0 = top-level comment
  parent_comment_id TEXT, -- For nested replies (future feature)

  -- Platform-specific metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  comment_created_at TIMESTAMPTZ,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(platform, platform_comment_id)
);

-- Create indexes for performance
CREATE INDEX idx_comments_content_id ON content_comments(content_id);
CREATE INDEX idx_comments_platform ON content_comments(platform);
CREATE INDEX idx_comments_saved_at ON content_comments(saved_at DESC);
CREATE INDEX idx_comments_likes ON content_comments(likes_count DESC);
CREATE INDEX idx_comments_platform_comment_id ON content_comments(platform, platform_comment_id);

-- Enable Row Level Security
ALTER TABLE content_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (public access for MVP, can be restricted later)
CREATE POLICY "Public read comments" ON content_comments
  FOR SELECT USING (true);

CREATE POLICY "Public insert comments" ON content_comments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update comments" ON content_comments
  FOR UPDATE USING (true);

CREATE POLICY "Public delete comments" ON content_comments
  FOR DELETE USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER comments_updated_at_trigger
  BEFORE UPDATE ON content_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comments_updated_at();

-- Add comments for documentation
COMMENT ON TABLE content_comments IS 'Stores interesting comments/replies saved from social media posts, linked to parent content';
COMMENT ON COLUMN content_comments.id IS 'Deterministic ID format: platform:commentId (e.g., youtube:comment123)';
COMMENT ON COLUMN content_comments.content_id IS 'Foreign key to parent content this comment is attached to';
COMMENT ON COLUMN content_comments.platform IS 'Platform where comment was found: youtube, twitter, reddit, bluesky';
COMMENT ON COLUMN content_comments.platform_comment_id IS 'Platform-specific comment ID (e.g., YouTube comment ID, tweet ID for replies)';
COMMENT ON COLUMN content_comments.position_in_thread IS 'Position in comment thread: 0 = top-level, 1+ = nested reply';
COMMENT ON COLUMN content_comments.metadata IS 'Platform-specific data (timestamps, edit history, etc.)';
