-- =============================================
-- Show Category Templates Migration
-- Creates show_category_templates and show_category_template_tags tables
-- for defining custom content categories/pillars per show
-- =============================================

-- =============================================
-- STEP 1: Create show_category_templates table
-- =============================================

CREATE TABLE show_category_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,

  name TEXT NOT NULL,                    -- e.g., "AI News", "3D Showcase"
  slug TEXT NOT NULL,                    -- URL-safe identifier
  description TEXT,
  icon TEXT,                             -- emoji or icon identifier

  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(show_id, slug)
);

-- Indexes for show_category_templates
CREATE INDEX idx_show_category_templates_show_id ON show_category_templates(show_id);
CREATE INDEX idx_show_category_templates_display_order ON show_category_templates(show_id, display_order);

-- RLS for show_category_templates
ALTER TABLE show_category_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read templates" ON show_category_templates FOR SELECT USING (true);
CREATE POLICY "Authenticated insert templates" ON show_category_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated update templates" ON show_category_templates FOR UPDATE USING (true);
CREATE POLICY "Authenticated delete templates" ON show_category_templates FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_show_category_templates_updated_at
  BEFORE UPDATE ON show_category_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- STEP 2: Create show_category_template_tags junction table
-- =============================================

CREATE TABLE show_category_template_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES show_category_templates(id) ON DELETE CASCADE,
  tag_slug TEXT NOT NULL,                -- References tags.slug (soft reference for flexibility)
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(template_id, tag_slug)
);

-- Indexes for show_category_template_tags
CREATE INDEX idx_template_tags_template_id ON show_category_template_tags(template_id);
CREATE INDEX idx_template_tags_tag_slug ON show_category_template_tags(tag_slug);

-- RLS for show_category_template_tags
ALTER TABLE show_category_template_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read template_tags" ON show_category_template_tags FOR SELECT USING (true);
CREATE POLICY "Authenticated insert template_tags" ON show_category_template_tags FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated update template_tags" ON show_category_template_tags FOR UPDATE USING (true);
CREATE POLICY "Authenticated delete template_tags" ON show_category_template_tags FOR DELETE USING (true);

-- =============================================
-- STEP 3: Add template_id to content_blocks
-- Links content blocks to their source template when auto-populated
-- =============================================

ALTER TABLE content_blocks ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES show_category_templates(id) ON DELETE SET NULL;

-- Index for looking up blocks by template
CREATE INDEX IF NOT EXISTS idx_content_blocks_template_id ON content_blocks(template_id);

-- =============================================
-- STEP 4: Helper function to get content suggestions for a template
-- =============================================

CREATE OR REPLACE FUNCTION get_template_content_suggestions(
  p_template_id UUID,
  p_since_date TIMESTAMPTZ,
  p_limit INTEGER DEFAULT 30
)
RETURNS TABLE(
  content_id UUID,
  platform TEXT,
  url TEXT,
  title TEXT,
  description TEXT,
  author_name TEXT,
  author_avatar TEXT,
  image_url TEXT,
  video_url TEXT,
  video_embed_url TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS content_id,
    c.platform,
    c.url,
    c.title,
    c.description,
    c.author_name,
    c.author_avatar,
    c.image_url,
    c.video_url,
    c.video_embed_url,
    c.tags,
    c.created_at
  FROM content c
  WHERE c.approval_status = 'approved'
    AND c.created_at > p_since_date
    AND c.tags && (
      SELECT ARRAY_AGG(tt.tag_slug)
      FROM show_category_template_tags tt
      WHERE tt.template_id = p_template_id
    )
  ORDER BY c.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- STEP 5: Function to get last episode date for a show
-- =============================================

CREATE OR REPLACE FUNCTION get_last_episode_date(p_show_id UUID)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_last_date TIMESTAMPTZ;
  v_show_created_at TIMESTAMPTZ;
BEGIN
  -- Get the most recent completed episode date
  SELECT MAX(e.scheduled_at) INTO v_last_date
  FROM episodes e
  WHERE e.show_id = p_show_id
    AND e.status = 'completed';

  -- If no completed episodes, get the show creation date
  IF v_last_date IS NULL THEN
    SELECT s.created_at INTO v_show_created_at
    FROM shows s
    WHERE s.id = p_show_id;

    RETURN COALESCE(v_show_created_at, NOW() - INTERVAL '30 days');
  END IF;

  RETURN v_last_date;
END;
$$ LANGUAGE plpgsql;
