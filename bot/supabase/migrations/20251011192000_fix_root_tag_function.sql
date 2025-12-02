-- Fix get_root_tag_for_slug to properly walk up the tree

CREATE OR REPLACE FUNCTION get_root_tag_for_slug(tag_slug text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  current_tag_id uuid;
  current_parent_id uuid;
BEGIN
  -- Get tag ID and parent_id from slug
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
    -- Get the parent's parent
    SELECT id, parent_id INTO current_tag_id, current_parent_id
    FROM tags
    WHERE id = current_parent_id;

    -- If parent has no parent, we found the root
    EXIT WHEN current_parent_id IS NULL;
  END LOOP;

  RETURN current_tag_id;
END;
$$;

COMMENT ON FUNCTION get_root_tag_for_slug IS 'Returns root tag ID (depth=0) for any tag slug by walking up the parent chain';
