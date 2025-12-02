-- Add tagged_posts table for Chrome extension compatibility
-- This is a simplified table that the extension uses directly

CREATE TABLE tagged_posts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tweet_id TEXT NOT NULL,
  tweet_text TEXT,
  author TEXT,
  url TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id TEXT DEFAULT 'anonymous',
  category TEXT DEFAULT 'uncategorized',
  tags JSONB DEFAULT '[]'::jsonb,
  categories JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tweet_id)
);

-- Create indexes
CREATE INDEX idx_tagged_posts_tweet_id ON tagged_posts(tweet_id);
CREATE INDEX idx_tagged_posts_timestamp ON tagged_posts(timestamp DESC);
CREATE INDEX idx_tagged_posts_user_id ON tagged_posts(user_id);
CREATE INDEX idx_tagged_posts_tags ON tagged_posts USING GIN(tags);
CREATE INDEX idx_tagged_posts_categories ON tagged_posts USING GIN(categories);

-- Enable RLS
ALTER TABLE tagged_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow public read and write for MVP
CREATE POLICY "Public read tagged_posts" ON tagged_posts FOR SELECT USING (true);
CREATE POLICY "Public insert tagged_posts" ON tagged_posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update tagged_posts" ON tagged_posts FOR UPDATE USING (true);
CREATE POLICY "Public delete tagged_posts" ON tagged_posts FOR DELETE USING (true);

-- Add comment
COMMENT ON TABLE tagged_posts IS 'Simplified table for Chrome extension - stores tagged X.com posts with hierarchical tags';
