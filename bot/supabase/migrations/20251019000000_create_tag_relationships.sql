-- Create tag_relationships table for weighted tag connections
-- This enables SKOS-inspired semantic relationships between tags
-- Examples: "blender" → "3d-development" (tool_of: 0.95)
--           "animation" → "3d-development" (technique_of: 0.90)

CREATE TABLE IF NOT EXISTS tag_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id_1 UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  tag_id_2 UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,

  -- Relationship type following SKOS vocabulary
  -- 'related': general association (symmetric)
  -- 'tool_of': tag_1 is a tool/software used in tag_2 context
  -- 'technique_of': tag_1 is a technique/method within tag_2 domain
  -- 'part_of': tag_1 is a component/subset of tag_2
  relationship_type TEXT NOT NULL CHECK (relationship_type IN (
    'related',
    'tool_of',
    'technique_of',
    'part_of'
  )),

  -- Strength of relationship (0.0 to 1.0)
  -- 0.9-1.0: Very strong (blender → 3d)
  -- 0.7-0.89: Strong (animation → 3d)
  -- 0.5-0.69: Moderate (tools → development)
  -- 0.0-0.49: Weak (loose associations)
  strength DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (strength >= 0.0 AND strength <= 1.0),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id), -- Optional: track who created relationship

  -- Prevent duplicate relationships (same tags + same type)
  UNIQUE(tag_id_1, tag_id_2, relationship_type),

  -- Prevent self-relationships
  CHECK (tag_id_1 != tag_id_2)
);

-- Indexes for fast bidirectional lookups
CREATE INDEX idx_tag_relationships_tag1 ON tag_relationships(tag_id_1);
CREATE INDEX idx_tag_relationships_tag2 ON tag_relationships(tag_id_2);
CREATE INDEX idx_tag_relationships_type ON tag_relationships(relationship_type);
CREATE INDEX idx_tag_relationships_strength ON tag_relationships(strength DESC);

-- Composite index for common query: find all relationships for a tag
CREATE INDEX idx_tag_relationships_tag1_type_strength ON tag_relationships(tag_id_1, relationship_type, strength DESC);

-- Function to get related tags with strength scores (bidirectional)
CREATE OR REPLACE FUNCTION get_related_tags(
  p_tag_id UUID,
  p_min_strength DECIMAL DEFAULT 0.5,
  p_relationship_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  tag_id UUID,
  tag_name TEXT,
  tag_slug TEXT,
  relationship_type TEXT,
  strength DECIMAL,
  direction TEXT -- 'outbound' or 'inbound'
) AS $$
BEGIN
  RETURN QUERY
  -- Outbound relationships (tag_id_1 → tag_id_2)
  SELECT
    t.id AS tag_id,
    t.name AS tag_name,
    t.slug AS tag_slug,
    tr.relationship_type,
    tr.strength,
    'outbound'::TEXT AS direction
  FROM tag_relationships tr
  JOIN tags t ON t.id = tr.tag_id_2
  WHERE tr.tag_id_1 = p_tag_id
    AND tr.strength >= p_min_strength
    AND (p_relationship_type IS NULL OR tr.relationship_type = p_relationship_type)

  UNION ALL

  -- Inbound relationships (tag_id_2 ← tag_id_1)
  -- For symmetric 'related' type, show these too
  SELECT
    t.id AS tag_id,
    t.name AS tag_name,
    t.slug AS tag_slug,
    tr.relationship_type,
    tr.strength,
    'inbound'::TEXT AS direction
  FROM tag_relationships tr
  JOIN tags t ON t.id = tr.tag_id_1
  WHERE tr.tag_id_2 = p_tag_id
    AND tr.strength >= p_min_strength
    AND tr.relationship_type = 'related' -- Only symmetric relationships
    AND (p_relationship_type IS NULL OR tr.relationship_type = p_relationship_type)

  ORDER BY strength DESC, tag_name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to suggest tags based on multiple input tags (for autocomplete)
CREATE OR REPLACE FUNCTION suggest_tags_by_relationships(
  p_tag_ids UUID[],
  p_min_strength DECIMAL DEFAULT 0.6,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  tag_id UUID,
  tag_name TEXT,
  tag_slug TEXT,
  avg_strength DECIMAL,
  match_count INT
) AS $$
BEGIN
  RETURN QUERY
  WITH related_tags AS (
    -- Get all tags related to input tags
    SELECT
      tr.tag_id_2 AS related_tag_id,
      tr.strength
    FROM tag_relationships tr
    WHERE tr.tag_id_1 = ANY(p_tag_ids)
      AND tr.strength >= p_min_strength
      AND tr.tag_id_2 != ALL(p_tag_ids) -- Don't suggest input tags

    UNION ALL

    -- Bidirectional for 'related' type
    SELECT
      tr.tag_id_1 AS related_tag_id,
      tr.strength
    FROM tag_relationships tr
    WHERE tr.tag_id_2 = ANY(p_tag_ids)
      AND tr.relationship_type = 'related'
      AND tr.strength >= p_min_strength
      AND tr.tag_id_1 != ALL(p_tag_ids)
  )
  SELECT
    t.id AS tag_id,
    t.name AS tag_name,
    t.slug AS tag_slug,
    ROUND(AVG(rt.strength)::numeric, 2) AS avg_strength,
    COUNT(*)::INT AS match_count
  FROM related_tags rt
  JOIN tags t ON t.id = rt.related_tag_id
  GROUP BY t.id, t.name, t.slug
  ORDER BY match_count DESC, avg_strength DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT SELECT ON tag_relationships TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON tag_relationships TO authenticated;

-- Comment
COMMENT ON TABLE tag_relationships IS 'Weighted semantic relationships between tags following SKOS principles';
COMMENT ON COLUMN tag_relationships.strength IS 'Relationship strength: 0.9-1.0 very strong, 0.7-0.89 strong, 0.5-0.69 moderate, 0.0-0.49 weak';
COMMENT ON FUNCTION get_related_tags IS 'Get all tags related to a given tag with strength scores (bidirectional for symmetric relationships)';
COMMENT ON FUNCTION suggest_tags_by_relationships IS 'Suggest tags based on multiple input tags, ranked by match count and strength';
