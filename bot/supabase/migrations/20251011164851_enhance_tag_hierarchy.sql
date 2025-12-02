-- Enhance tag hierarchy with additional fields and helper functions

-- Add metadata fields to tags table
ALTER TABLE tags ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE tags ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE tags ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE tags ADD COLUMN IF NOT EXISTS depth INTEGER DEFAULT 0;
ALTER TABLE tags ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- Update depth calculation trigger
CREATE OR REPLACE FUNCTION update_tag_path()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.path := ARRAY[NEW.name];
    NEW.depth := 0;
  ELSE
    SELECT path || NEW.name, array_length(path, 1) INTO NEW.path, NEW.depth
    FROM tags WHERE id = NEW.parent_id;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper function: Get all children of a tag (recursive)
CREATE OR REPLACE FUNCTION get_tag_children(parent_tag_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  parent_id UUID,
  path TEXT[],
  depth INTEGER,
  description TEXT,
  icon TEXT,
  color TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE tag_tree AS (
    -- Base case: direct children
    SELECT t.id, t.name, t.parent_id, t.path, t.depth, t.description, t.icon, t.color
    FROM tags t
    WHERE t.parent_id = parent_tag_id
    
    UNION ALL
    
    -- Recursive case: children of children
    SELECT t.id, t.name, t.parent_id, t.path, t.depth, t.description, t.icon, t.color
    FROM tags t
    INNER JOIN tag_tree tt ON t.parent_id = tt.id
  )
  SELECT * FROM tag_tree ORDER BY path;
END;
$$ LANGUAGE plpgsql;

-- Helper function: Get all ancestors of a tag
CREATE OR REPLACE FUNCTION get_tag_ancestors(tag_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  parent_id UUID,
  path TEXT[],
  depth INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE tag_ancestors AS (
    -- Base case: the tag itself
    SELECT t.id, t.name, t.parent_id, t.path, t.depth
    FROM tags t
    WHERE t.id = tag_id
    
    UNION ALL
    
    -- Recursive case: parents
    SELECT t.id, t.name, t.parent_id, t.path, t.depth
    FROM tags t
    INNER JOIN tag_ancestors ta ON t.id = ta.parent_id
  )
  SELECT * FROM tag_ancestors WHERE id != tag_id ORDER BY depth;
END;
$$ LANGUAGE plpgsql;

-- Helper function: Get tag hierarchy as tree (with full path)
CREATE OR REPLACE FUNCTION get_tag_tree()
RETURNS TABLE (
  id UUID,
  name TEXT,
  full_path TEXT,
  parent_id UUID,
  depth INTEGER,
  children_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    array_to_string(t.path, ' > ') as full_path,
    t.parent_id,
    t.depth,
    (SELECT COUNT(*) FROM tags WHERE parent_id = t.id) as children_count
  FROM tags t
  ORDER BY t.path;
END;
$$ LANGUAGE plpgsql;

-- Helper function: Find or create tag by path
CREATE OR REPLACE FUNCTION find_or_create_tag(
  tag_name TEXT,
  parent_tag_name TEXT DEFAULT NULL,
  tag_description TEXT DEFAULT NULL,
  tag_icon TEXT DEFAULT NULL,
  tag_color TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  parent_tag_id UUID;
  tag_id UUID;
BEGIN
  -- Find parent if specified
  IF parent_tag_name IS NOT NULL THEN
    SELECT id INTO parent_tag_id FROM tags WHERE name = parent_tag_name LIMIT 1;
    
    IF parent_tag_id IS NULL THEN
      -- Create parent if it doesn't exist
      INSERT INTO tags (name, description, icon, color)
      VALUES (parent_tag_name, NULL, NULL, NULL)
      RETURNING id INTO parent_tag_id;
    END IF;
  END IF;

  -- Check if tag exists
  SELECT id INTO tag_id 
  FROM tags 
  WHERE name = tag_name 
    AND (parent_id = parent_tag_id OR (parent_id IS NULL AND parent_tag_id IS NULL))
  LIMIT 1;

  IF tag_id IS NOT NULL THEN
    -- Update metadata if provided
    IF tag_description IS NOT NULL OR tag_icon IS NOT NULL OR tag_color IS NOT NULL THEN
      UPDATE tags SET
        description = COALESCE(tag_description, description),
        icon = COALESCE(tag_icon, icon),
        color = COALESCE(tag_color, color),
        updated_at = NOW()
      WHERE id = tag_id;
    END IF;
    
    RETURN tag_id;
  ELSE
    -- Create new tag
    INSERT INTO tags (name, parent_id, description, icon, color)
    VALUES (tag_name, parent_tag_id, tag_description, tag_icon, tag_color)
    RETURNING id INTO tag_id;
    
    RETURN tag_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Allow anonymous users to create tags (MVP - will restrict later)
DROP POLICY IF EXISTS "Auth create tags" ON tags;
CREATE POLICY "Public create tags" ON tags FOR INSERT
WITH CHECK (true);

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_tags_depth ON tags(depth);
CREATE INDEX IF NOT EXISTS idx_tags_is_system ON tags(is_system);

-- Seed initial tag hierarchy from extension categories
INSERT INTO tags (name, description, icon, is_system) VALUES
  ('Content Type', 'Type of content or format', '📝', true),
  ('Topic', 'Subject matter or domain', '🏷️', true),
  ('Quality', 'Content quality indicators', '⭐', true),
  ('Action', 'Intended user actions', '🎯', true)
ON CONFLICT DO NOTHING;

-- Seed subcategories
DO $$
DECLARE
  content_type_id UUID;
  topic_id UUID;
  quality_id UUID;
  action_id UUID;
BEGIN
  SELECT id INTO content_type_id FROM tags WHERE name = 'Content Type';
  SELECT id INTO topic_id FROM tags WHERE name = 'Topic';
  SELECT id INTO quality_id FROM tags WHERE name = 'Quality';
  SELECT id INTO action_id FROM tags WHERE name = 'Action';

  -- Content Type children
  INSERT INTO tags (name, parent_id, is_system) VALUES
    ('Article', content_type_id, true),
    ('Thread', content_type_id, true),
    ('Meme', content_type_id, true),
    ('News', content_type_id, true),
    ('Tutorial', content_type_id, true),
    ('Opinion', content_type_id, true),
    ('Question', content_type_id, true)
  ON CONFLICT DO NOTHING;

  -- Topic children
  INSERT INTO tags (name, parent_id, is_system) VALUES
    ('Tech', topic_id, true),
    ('AI/ML', topic_id, true),
    ('Design', topic_id, true),
    ('Business', topic_id, true),
    ('Politics', topic_id, true),
    ('Science', topic_id, true),
    ('Sports', topic_id, true),
    ('Entertainment', topic_id, true)
  ON CONFLICT DO NOTHING;

  -- Quality children
  INSERT INTO tags (name, parent_id, is_system) VALUES
    ('Must Read', quality_id, true),
    ('Important', quality_id, true),
    ('Interesting', quality_id, true),
    ('Controversial', quality_id, true),
    ('Funny', quality_id, true),
    ('Inspirational', quality_id, true)
  ON CONFLICT DO NOTHING;

  -- Action children
  INSERT INTO tags (name, parent_id, is_system) VALUES
    ('Read Later', action_id, true),
    ('Research', action_id, true),
    ('Share', action_id, true),
    ('Follow Up', action_id, true),
    ('Bookmark', action_id, true),
    ('Archive', action_id, true)
  ON CONFLICT DO NOTHING;
END $$;

COMMENT ON COLUMN tags.path IS 'Materialized path for efficient hierarchy queries';
COMMENT ON COLUMN tags.depth IS 'Depth level in hierarchy (0 = root)';
COMMENT ON COLUMN tags.is_system IS 'System-defined tags that cannot be deleted by users';
COMMENT ON FUNCTION get_tag_children(UUID) IS 'Returns all descendants of a tag';
COMMENT ON FUNCTION get_tag_ancestors(UUID) IS 'Returns all ancestors of a tag';
COMMENT ON FUNCTION get_tag_tree() IS 'Returns the complete tag hierarchy';
COMMENT ON FUNCTION find_or_create_tag(TEXT, TEXT, TEXT, TEXT, TEXT) IS 'Finds existing tag or creates new one with parent relationship';
