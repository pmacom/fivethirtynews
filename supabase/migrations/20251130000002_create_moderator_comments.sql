-- Migration: Create moderator_comments table
-- Separate from user notes - allows extended moderator commentary with types and pinning

CREATE TABLE IF NOT EXISTS moderator_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationships
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Comment content (extended limit - 2000 chars vs 280 for user notes)
  comment_text TEXT NOT NULL CHECK (char_length(comment_text) <= 2000),

  -- Comment classification
  comment_type TEXT DEFAULT 'note' CHECK (comment_type IN ('note', 'context', 'warning', 'highlight', 'question')),

  -- Visibility and priority
  is_pinned BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,

  -- Author snapshot (for display even if user changes name)
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  author_role TEXT NOT NULL CHECK (author_role IN ('admin', 'moderator')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_mod_comments_content ON moderator_comments(content_id);
CREATE INDEX IF NOT EXISTS idx_mod_comments_user ON moderator_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_mod_comments_pinned ON moderator_comments(is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_mod_comments_created ON moderator_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mod_comments_public ON moderator_comments(is_public) WHERE is_public = true;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_moderator_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_moderator_comments_updated_at ON moderator_comments;
CREATE TRIGGER trigger_moderator_comments_updated_at
  BEFORE UPDATE ON moderator_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_moderator_comments_updated_at();
