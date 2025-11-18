-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create episodes table
CREATE TABLE IF NOT EXISTS episodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content table (the actual content items)
CREATE TABLE IF NOT EXISTS content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version INTEGER DEFAULT 1,
  content_type TEXT NOT NULL, -- 'video', 'twitter', 'warpcast', 'website', 'discord', 'image'
  content_url TEXT NOT NULL,
  content_id TEXT, -- external ID (e.g., tweet ID)
  content_created_at TIMESTAMP WITH TIME ZONE,
  thumbnail_url TEXT,
  submitted_by TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  category TEXT,
  categories TEXT[],
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content_blocks table (categories within an episode)
CREATE TABLE IF NOT EXISTS content_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  weight INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content_block_items table (junction table linking blocks to content)
CREATE TABLE IF NOT EXISTS content_block_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_block_id UUID NOT NULL REFERENCES content_blocks(id) ON DELETE CASCADE,
  news_id UUID REFERENCES content(id) ON DELETE CASCADE,
  note TEXT,
  weight INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tweets table (for caching full tweet data)
CREATE TABLE IF NOT EXISTS tweets (
  id TEXT PRIMARY KEY, -- Twitter/X tweet ID
  data JSONB NOT NULL, -- Full tweet data from Twitter API
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_content_blocks_episode_id ON content_blocks(episode_id);
CREATE INDEX IF NOT EXISTS idx_content_blocks_weight ON content_blocks(weight);
CREATE INDEX IF NOT EXISTS idx_content_block_items_block_id ON content_block_items(content_block_id);
CREATE INDEX IF NOT EXISTS idx_content_block_items_news_id ON content_block_items(news_id);
CREATE INDEX IF NOT EXISTS idx_content_block_items_weight ON content_block_items(weight);
CREATE INDEX IF NOT EXISTS idx_content_type ON content(content_type);
CREATE INDEX IF NOT EXISTS idx_episodes_date ON episodes(date DESC);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_episodes_updated_at BEFORE UPDATE ON episodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_updated_at BEFORE UPDATE ON content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_blocks_updated_at BEFORE UPDATE ON content_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_block_items_updated_at BEFORE UPDATE ON content_block_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tweets_updated_at BEFORE UPDATE ON tweets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
