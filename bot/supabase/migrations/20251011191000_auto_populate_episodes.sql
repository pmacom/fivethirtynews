-- Migration: Auto-populate episodes when posts are tagged
-- Automatically creates episode, content_blocks, and content_block_items
-- when a post is inserted or its tags are updated

-- ============================================
-- FUNCTION: Auto-populate episode structure
-- ============================================

CREATE OR REPLACE FUNCTION auto_populate_episode_from_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  post_date date;
  episode_id_result uuid;
  tag_slug text;
  root_tag_id uuid;
  content_block_id_result uuid;
  current_weight integer;
BEGIN
  -- Get the date from the post timestamp (or use current date if null)
  post_date := COALESCE(DATE(NEW.timestamp), CURRENT_DATE);

  -- Get or create episode for this date
  episode_id_result := get_or_create_episode(post_date);

  -- Process each tag in the tags jsonb array
  FOR tag_slug IN SELECT jsonb_array_elements_text(NEW.tags)
  LOOP
    -- Get the root tag for this tag slug
    root_tag_id := get_root_tag_for_slug(tag_slug);

    -- Skip if we couldn't find a root tag
    CONTINUE WHEN root_tag_id IS NULL;

    -- Get or create content_block for this episode + root tag
    SELECT id INTO content_block_id_result
    FROM content_blocks
    WHERE episode_id = episode_id_result
    AND tag_id = root_tag_id;

    IF content_block_id_result IS NULL THEN
      -- Create new content block
      INSERT INTO content_blocks (episode_id, tag_id, title, description, weight)
      SELECT
        episode_id_result,
        root_tag_id,
        t.name,
        t.description,
        0
      FROM tags t
      WHERE t.id = root_tag_id
      RETURNING id INTO content_block_id_result;
    END IF;

    -- Get current max weight for this content block
    SELECT COALESCE(MAX(weight), -1) INTO current_weight
    FROM content_block_items
    WHERE content_block_id = content_block_id_result;

    -- Insert content_block_item (or update if exists)
    INSERT INTO content_block_items (
      content_block_id,
      post_id,
      note,
      weight
    )
    VALUES (
      content_block_id_result,
      NEW.id,
      '', -- Empty note by default
      current_weight + 1
    )
    ON CONFLICT (content_block_id, post_id)
    DO NOTHING; -- Don't duplicate if post already in this block

  END LOOP;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_populate_episode_from_post IS 'Automatically creates episode structure when posts are tagged. Creates episode, content_blocks for root tags, and content_block_items for posts. Posts appear in multiple content_blocks if tagged with multiple root categories.';

-- ============================================
-- TRIGGER: On tagged_posts INSERT/UPDATE
-- ============================================

CREATE TRIGGER trigger_auto_populate_episode_from_post
  AFTER INSERT OR UPDATE OF tags
  ON tagged_posts
  FOR EACH ROW
  WHEN (NEW.tags IS NOT NULL AND jsonb_array_length(NEW.tags) > 0)
  EXECUTE FUNCTION auto_populate_episode_from_post();

COMMENT ON TRIGGER trigger_auto_populate_episode_from_post ON tagged_posts IS
  'Triggers episode population when posts are tagged';

-- ============================================
-- UNIQUE CONSTRAINT: Prevent duplicate posts in same content_block
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_content_block_items_unique_post_per_block
ON content_block_items(content_block_id, post_id);

COMMENT ON INDEX idx_content_block_items_unique_post_per_block IS
  'Ensures a post only appears once per content block';

-- ============================================
-- FUNCTION: Clean up empty content blocks
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_empty_content_blocks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete content blocks that have no items
  DELETE FROM content_blocks
  WHERE NOT EXISTS (
    SELECT 1
    FROM content_block_items
    WHERE content_block_items.content_block_id = content_blocks.id
  );
END;
$$;

COMMENT ON FUNCTION cleanup_empty_content_blocks IS
  'Removes content blocks that have no items. Run periodically or after bulk deletions.';

-- ============================================
-- FUNCTION: Rebuild episode for a specific date
-- ============================================

CREATE OR REPLACE FUNCTION rebuild_episode_for_date(target_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  episode_id_result uuid;
  post_record RECORD;
BEGIN
  -- Get or create episode
  episode_id_result := get_or_create_episode(target_date);

  -- Delete existing content_block_items for this episode
  DELETE FROM content_block_items
  WHERE content_block_id IN (
    SELECT id FROM content_blocks WHERE episode_id = episode_id_result
  );

  -- Delete existing content_blocks
  DELETE FROM content_blocks WHERE episode_id = episode_id_result;

  -- Reprocess all posts for this date
  FOR post_record IN
    SELECT *
    FROM tagged_posts
    WHERE DATE(timestamp) = target_date
    AND tags IS NOT NULL
    AND jsonb_array_length(tags) > 0
  LOOP
    -- Trigger will automatically populate episode structure
    UPDATE tagged_posts
    SET updated_at = now()
    WHERE id = post_record.id;
  END LOOP;

  -- Clean up any empty blocks
  PERFORM cleanup_empty_content_blocks();
END;
$$;

COMMENT ON FUNCTION rebuild_episode_for_date IS 'Completely rebuilds episode structure for a specific date. Useful for fixing data or after schema changes.';
