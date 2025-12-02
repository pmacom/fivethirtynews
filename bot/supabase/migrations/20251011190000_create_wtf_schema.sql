-- Migration: Create WTF-compatible schema
-- Creates episodes, content_blocks, and content_block_items tables
-- Aligns 530 database with WTF library requirements

-- ============================================
-- 1. ADD THUMBNAIL SUPPORT TO TAGGED POSTS
-- ============================================

ALTER TABLE tagged_posts
ADD COLUMN IF NOT EXISTS thumbnail_url text;

COMMENT ON COLUMN tagged_posts.thumbnail_url IS 'Thumbnail image URL extracted from tweet/post';

CREATE INDEX IF NOT EXISTS idx_tagged_posts_thumbnail_url
ON tagged_posts(thumbnail_url)
WHERE thumbnail_url IS NOT NULL;

-- ============================================
-- 2. CREATE EPISODES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  date date NOT NULL UNIQUE,
  is_auto_generated boolean DEFAULT true,
  is_published boolean DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE episodes IS 'Episodes for organizing content by date or theme';
COMMENT ON COLUMN episodes.is_auto_generated IS 'True if created automatically by daily job, false if manually created';
COMMENT ON COLUMN episodes.is_published IS 'Whether episode is visible to users';

CREATE INDEX IF NOT EXISTS idx_episodes_date ON episodes(date DESC);
CREATE INDEX IF NOT EXISTS idx_episodes_created_by ON episodes(created_by);
CREATE INDEX IF NOT EXISTS idx_episodes_is_published ON episodes(is_published);

-- ============================================
-- 3. CREATE CONTENT BLOCKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS content_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  weight integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(episode_id, tag_id)
);

COMMENT ON TABLE content_blocks IS 'Content categories within episodes, linked to root tags';
COMMENT ON COLUMN content_blocks.tag_id IS 'References root-level tag (depth=0) for this category';
COMMENT ON COLUMN content_blocks.weight IS 'Sort order within episode (lower = earlier)';

CREATE INDEX IF NOT EXISTS idx_content_blocks_episode_id ON content_blocks(episode_id);
CREATE INDEX IF NOT EXISTS idx_content_blocks_tag_id ON content_blocks(tag_id);
CREATE INDEX IF NOT EXISTS idx_content_blocks_weight ON content_blocks(episode_id, weight);

-- ============================================
-- 4. CREATE CONTENT BLOCK ITEMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS content_block_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_block_id uuid NOT NULL REFERENCES content_blocks(id) ON DELETE CASCADE,
  post_id text NOT NULL REFERENCES tagged_posts(id) ON DELETE CASCADE,
  note text,
  weight integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE content_block_items IS 'Individual posts within content blocks';
COMMENT ON COLUMN content_block_items.post_id IS 'References tagged_posts.id (not tweet_id)';
COMMENT ON COLUMN content_block_items.note IS 'Optional annotation or highlight for this item';
COMMENT ON COLUMN content_block_items.weight IS 'Sort order within content block';

CREATE INDEX IF NOT EXISTS idx_content_block_items_block_id ON content_block_items(content_block_id);
CREATE INDEX IF NOT EXISTS idx_content_block_items_post_id ON content_block_items(post_id);
CREATE INDEX IF NOT EXISTS idx_content_block_items_weight ON content_block_items(content_block_id, weight);

-- ============================================
-- 5. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Episodes: Public read, admin create/update/delete
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read episodes"
  ON episodes FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admin create episodes"
  ON episodes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin update episodes"
  ON episodes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin delete episodes"
  ON episodes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Content Blocks: Public read, admin manage
ALTER TABLE content_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read content_blocks"
  ON content_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM episodes
      WHERE episodes.id = content_blocks.episode_id
      AND episodes.is_published = true
    )
  );

CREATE POLICY "Admin manage content_blocks"
  ON content_blocks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Content Block Items: Public read, admin manage
ALTER TABLE content_block_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read content_block_items"
  ON content_block_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM content_blocks
      JOIN episodes ON episodes.id = content_blocks.episode_id
      WHERE content_blocks.id = content_block_items.content_block_id
      AND episodes.is_published = true
    )
  );

CREATE POLICY "Admin manage content_block_items"
  ON content_block_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function to get or create episode for a given date
CREATE OR REPLACE FUNCTION get_or_create_episode(episode_date date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  episode_id_result uuid;
BEGIN
  -- Try to get existing episode
  SELECT id INTO episode_id_result
  FROM episodes
  WHERE date = episode_date;

  -- If not found, create it
  IF episode_id_result IS NULL THEN
    INSERT INTO episodes (title, description, date, is_auto_generated)
    VALUES (
      'Daily Digest - ' || to_char(episode_date, 'Month DD, YYYY'),
      'Automatically generated daily episode',
      episode_date,
      true
    )
    RETURNING id INTO episode_id_result;
  END IF;

  RETURN episode_id_result;
END;
$$;

COMMENT ON FUNCTION get_or_create_episode IS 'Gets existing episode for date or creates new auto-generated one';

-- Function to get root tag for a given tag slug
CREATE OR REPLACE FUNCTION get_root_tag_for_slug(tag_slug text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result_tag_id uuid;
  current_tag_id uuid;
  current_parent_id uuid;
BEGIN
  -- Get tag ID from slug
  SELECT id, parent_id INTO current_tag_id, current_parent_id
  FROM tags
  WHERE slug = tag_slug;

  -- If tag not found, return NULL
  IF current_tag_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- If already a root tag (no parent), return it
  IF current_parent_id IS NULL THEN
    RETURN current_tag_id;
  END IF;

  -- Walk up the tree to find root
  LOOP
    SELECT parent_id INTO current_parent_id
    FROM tags
    WHERE id = current_parent_id;

    EXIT WHEN current_parent_id IS NULL;

    current_tag_id := current_parent_id;
  END LOOP;

  RETURN current_tag_id;
END;
$$;

COMMENT ON FUNCTION get_root_tag_for_slug IS 'Returns root tag ID for any tag slug by walking up the tree';

-- ============================================
-- 7. TRIGGER FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_episodes_updated_at
  BEFORE UPDATE ON episodes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_blocks_updated_at
  BEFORE UPDATE ON content_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_block_items_updated_at
  BEFORE UPDATE ON content_block_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON episodes TO anon, authenticated;
GRANT SELECT ON content_blocks TO anon, authenticated;
GRANT SELECT ON content_block_items TO anon, authenticated;

GRANT ALL ON episodes TO service_role;
GRANT ALL ON content_blocks TO service_role;
GRANT ALL ON content_block_items TO service_role;
