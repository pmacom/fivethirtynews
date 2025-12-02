-- Create tag_co_occurrence table for data-driven tag suggestions
-- Tracks which tags are frequently used together
-- Enables "often used together" recommendations based on actual usage patterns

CREATE TABLE IF NOT EXISTS tag_co_occurrence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id_1 UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  tag_id_2 UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,

  -- How many times these two tags appeared together
  count INT NOT NULL DEFAULT 1,

  -- Confidence score using Jaccard Index: intersection / union
  -- Updated automatically when count changes
  -- Formula: count(A ∩ B) / (count(A) + count(B) - count(A ∩ B))
  confidence DECIMAL(4,3) DEFAULT 0.0,

  -- Metadata
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure tag_id_1 < tag_id_2 to prevent duplicate pairs (A,B) and (B,A)
  CHECK (tag_id_1 < tag_id_2),

  -- Unique constraint on tag pair
  UNIQUE(tag_id_1, tag_id_2)
);

-- Indexes for fast lookups
CREATE INDEX idx_tag_co_occurrence_tag1 ON tag_co_occurrence(tag_id_1);
CREATE INDEX idx_tag_co_occurrence_tag2 ON tag_co_occurrence(tag_id_2);
CREATE INDEX idx_tag_co_occurrence_count ON tag_co_occurrence(count DESC);
CREATE INDEX idx_tag_co_occurrence_confidence ON tag_co_occurrence(confidence DESC);

-- Function to increment co-occurrence when tags are saved together
CREATE OR REPLACE FUNCTION increment_tag_co_occurrence(p_tag_ids UUID[])
RETURNS VOID AS $$
DECLARE
  v_tag_1 UUID;
  v_tag_2 UUID;
  i INT;
  j INT;
BEGIN
  -- For each pair of tags in the array, increment co-occurrence
  FOR i IN 1..array_length(p_tag_ids, 1) LOOP
    FOR j IN (i+1)..array_length(p_tag_ids, 1) LOOP
      v_tag_1 := LEAST(p_tag_ids[i], p_tag_ids[j]);
      v_tag_2 := GREATEST(p_tag_ids[i], p_tag_ids[j]);

      INSERT INTO tag_co_occurrence (tag_id_1, tag_id_2, count, last_seen)
      VALUES (v_tag_1, v_tag_2, 1, NOW())
      ON CONFLICT (tag_id_1, tag_id_2)
      DO UPDATE SET
        count = tag_co_occurrence.count + 1,
        last_seen = NOW();
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update confidence scores (Jaccard Index)
-- Should be run periodically or after batch updates
CREATE OR REPLACE FUNCTION update_co_occurrence_confidence()
RETURNS VOID AS $$
BEGIN
  UPDATE tag_co_occurrence tco
  SET confidence = ROUND(
    (
      tco.count::DECIMAL /
      NULLIF(
        (SELECT COUNT(*) FROM content WHERE tags ? (SELECT slug FROM tags WHERE id = tco.tag_id_1)) +
        (SELECT COUNT(*) FROM content WHERE tags ? (SELECT slug FROM tags WHERE id = tco.tag_id_2)) -
        tco.count,
        0
      )
    )::numeric,
    3
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get frequently co-occurring tags for a given tag
CREATE OR REPLACE FUNCTION get_co_occurring_tags(
  p_tag_id UUID,
  p_min_count INT DEFAULT 2,
  p_min_confidence DECIMAL DEFAULT 0.1,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  tag_id UUID,
  tag_name TEXT,
  tag_slug TEXT,
  co_occurrence_count INT,
  confidence DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS tag_id,
    t.name AS tag_name,
    t.slug AS tag_slug,
    tco.count AS co_occurrence_count,
    tco.confidence
  FROM tag_co_occurrence tco
  JOIN tags t ON (
    CASE
      WHEN tco.tag_id_1 = p_tag_id THEN t.id = tco.tag_id_2
      WHEN tco.tag_id_2 = p_tag_id THEN t.id = tco.tag_id_1
      ELSE FALSE
    END
  )
  WHERE (tco.tag_id_1 = p_tag_id OR tco.tag_id_2 = p_tag_id)
    AND tco.count >= p_min_count
    AND tco.confidence >= p_min_confidence
  ORDER BY tco.count DESC, tco.confidence DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to suggest tags by combining relationship strength + co-occurrence
CREATE OR REPLACE FUNCTION suggest_tags_hybrid(
  p_tag_ids UUID[],
  p_min_strength DECIMAL DEFAULT 0.5,
  p_min_confidence DECIMAL DEFAULT 0.1,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  tag_id UUID,
  tag_name TEXT,
  tag_slug TEXT,
  score DECIMAL,
  source TEXT -- 'relationship', 'co-occurrence', or 'both'
) AS $$
BEGIN
  RETURN QUERY
  WITH relationship_scores AS (
    -- Get tags from semantic relationships
    SELECT
      tr.tag_id_2 AS related_tag_id,
      AVG(tr.strength) AS avg_strength,
      'relationship'::TEXT AS source
    FROM tag_relationships tr
    WHERE tr.tag_id_1 = ANY(p_tag_ids)
      AND tr.strength >= p_min_strength
      AND tr.tag_id_2 != ALL(p_tag_ids)
    GROUP BY tr.tag_id_2

    UNION ALL

    -- Bidirectional for 'related' type
    SELECT
      tr.tag_id_1 AS related_tag_id,
      AVG(tr.strength) AS avg_strength,
      'relationship'::TEXT AS source
    FROM tag_relationships tr
    WHERE tr.tag_id_2 = ANY(p_tag_ids)
      AND tr.relationship_type = 'related'
      AND tr.strength >= p_min_strength
      AND tr.tag_id_1 != ALL(p_tag_ids)
    GROUP BY tr.tag_id_1
  ),
  co_occurrence_scores AS (
    -- Get tags from usage patterns
    SELECT
      CASE
        WHEN tco.tag_id_1 = ANY(p_tag_ids) THEN tco.tag_id_2
        ELSE tco.tag_id_1
      END AS related_tag_id,
      AVG(tco.confidence) AS avg_confidence,
      'co-occurrence'::TEXT AS source
    FROM tag_co_occurrence tco
    WHERE (tco.tag_id_1 = ANY(p_tag_ids) OR tco.tag_id_2 = ANY(p_tag_ids))
      AND tco.confidence >= p_min_confidence
      AND NOT (tco.tag_id_1 = ANY(p_tag_ids) AND tco.tag_id_2 = ANY(p_tag_ids))
    GROUP BY related_tag_id
  ),
  combined_scores AS (
    SELECT
      COALESCE(rs.related_tag_id, cs.related_tag_id) AS tag_id,
      -- Weighted score: 60% relationship strength + 40% co-occurrence confidence
      ROUND(
        (COALESCE(rs.avg_strength, 0) * 0.6 +
         COALESCE(cs.avg_confidence, 0) * 0.4)::numeric,
        3
      ) AS score,
      CASE
        WHEN rs.related_tag_id IS NOT NULL AND cs.related_tag_id IS NOT NULL THEN 'both'
        WHEN rs.related_tag_id IS NOT NULL THEN 'relationship'
        ELSE 'co-occurrence'
      END AS source
    FROM relationship_scores rs
    FULL OUTER JOIN co_occurrence_scores cs ON rs.related_tag_id = cs.related_tag_id
  )
  SELECT
    t.id AS tag_id,
    t.name AS tag_name,
    t.slug AS tag_slug,
    cs.score,
    cs.source
  FROM combined_scores cs
  JOIN tags t ON t.id = cs.tag_id
  ORDER BY cs.score DESC, t.name
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT SELECT ON tag_co_occurrence TO anon, authenticated;
GRANT INSERT, UPDATE ON tag_co_occurrence TO authenticated;

-- Comment
COMMENT ON TABLE tag_co_occurrence IS 'Tracks which tags are frequently used together for data-driven suggestions';
COMMENT ON COLUMN tag_co_occurrence.confidence IS 'Jaccard Index: intersection / union of tag usage';
COMMENT ON FUNCTION increment_tag_co_occurrence IS 'Call this function when content is tagged to track co-occurrence';
COMMENT ON FUNCTION update_co_occurrence_confidence IS 'Recalculate confidence scores using Jaccard Index (run periodically)';
COMMENT ON FUNCTION get_co_occurring_tags IS 'Get tags that frequently appear with the given tag';
COMMENT ON FUNCTION suggest_tags_hybrid IS 'Combine semantic relationships (60%) + usage patterns (40%) for smart suggestions';
