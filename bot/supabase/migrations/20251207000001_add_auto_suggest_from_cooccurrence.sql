-- Auto-suggest relationships from high-confidence co-occurrence patterns
-- This function promotes co-occurrences that meet threshold to the suggestion queue

-- Function to find and promote strong co-occurrences to suggestions
CREATE OR REPLACE FUNCTION promote_co_occurrences_to_suggestions(
  p_min_confidence DECIMAL DEFAULT 0.3,  -- Jaccard index threshold
  p_min_count INT DEFAULT 5,             -- Minimum times seen together
  p_max_suggestions INT DEFAULT 50       -- Limit new suggestions per run
)
RETURNS TABLE (
  suggestion_id UUID,
  tag_1_name TEXT,
  tag_2_name TEXT,
  confidence DECIMAL,
  co_occurrence_count INT
) AS $$
BEGIN
  RETURN QUERY
  WITH eligible_co_occurrences AS (
    -- Find co-occurrences that meet threshold
    SELECT
      tco.tag_id_1,
      tco.tag_id_2,
      tco.confidence,
      tco.count,
      t1.name AS tag_1_name,
      t2.name AS tag_2_name
    FROM tag_co_occurrence tco
    JOIN tags t1 ON t1.id = tco.tag_id_1
    JOIN tags t2 ON t2.id = tco.tag_id_2
    WHERE tco.confidence >= p_min_confidence
      AND tco.count >= p_min_count
      -- Not already in relationships (check both directions)
      AND NOT EXISTS (
        SELECT 1 FROM tag_relationships tr
        WHERE (tr.tag_id_1 = tco.tag_id_1 AND tr.tag_id_2 = tco.tag_id_2)
           OR (tr.tag_id_1 = tco.tag_id_2 AND tr.tag_id_2 = tco.tag_id_1)
      )
      -- Not already in suggestions (check both directions)
      AND NOT EXISTS (
        SELECT 1 FROM tag_relationship_suggestions trs
        WHERE ((trs.tag_id_1 = tco.tag_id_1 AND trs.tag_id_2 = tco.tag_id_2)
           OR (trs.tag_id_1 = tco.tag_id_2 AND trs.tag_id_2 = tco.tag_id_1))
          AND trs.status = 'pending'
      )
    ORDER BY tco.confidence DESC, tco.count DESC
    LIMIT p_max_suggestions
  ),
  inserted AS (
    INSERT INTO tag_relationship_suggestions (
      tag_id_1,
      tag_id_2,
      suggested_type,
      suggested_strength,
      suggested_by,  -- NULL indicates auto-detected
      suggestion_reason,
      status
    )
    SELECT
      eco.tag_id_1,
      eco.tag_id_2,
      'related',  -- Default to 'related' type
      -- Convert confidence to strength (scale 0.3-1.0 -> 0.5-0.9)
      LEAST(0.9, 0.5 + (eco.confidence * 0.5)),
      NULL,  -- No user - auto-detected
      format('Auto-detected: seen together %s times (confidence: %s%%)',
        eco.count,
        ROUND(eco.confidence * 100)
      ),
      'pending'
    FROM eligible_co_occurrences eco
    RETURNING id, tag_id_1, tag_id_2
  )
  SELECT
    i.id AS suggestion_id,
    eco.tag_1_name,
    eco.tag_2_name,
    eco.confidence,
    eco.count AS co_occurrence_count
  FROM inserted i
  JOIN eligible_co_occurrences eco ON i.tag_id_1 = eco.tag_id_1 AND i.tag_id_2 = eco.tag_id_2;
END;
$$ LANGUAGE plpgsql;

-- Function to check and auto-promote after co-occurrence update
-- Can be called as a trigger or scheduled job
CREATE OR REPLACE FUNCTION check_and_promote_co_occurrence()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check if the updated row meets threshold
  IF NEW.confidence >= 0.3 AND NEW.count >= 5 THEN
    -- Check if not already suggested or in relationships
    IF NOT EXISTS (
      SELECT 1 FROM tag_relationships tr
      WHERE (tr.tag_id_1 = NEW.tag_id_1 AND tr.tag_id_2 = NEW.tag_id_2)
         OR (tr.tag_id_1 = NEW.tag_id_2 AND tr.tag_id_2 = NEW.tag_id_1)
    ) AND NOT EXISTS (
      SELECT 1 FROM tag_relationship_suggestions trs
      WHERE ((trs.tag_id_1 = NEW.tag_id_1 AND trs.tag_id_2 = NEW.tag_id_2)
         OR (trs.tag_id_1 = NEW.tag_id_2 AND trs.tag_id_2 = NEW.tag_id_1))
        AND trs.status = 'pending'
    ) THEN
      -- Auto-create suggestion
      INSERT INTO tag_relationship_suggestions (
        tag_id_1,
        tag_id_2,
        suggested_type,
        suggested_strength,
        suggested_by,
        suggestion_reason,
        status
      )
      VALUES (
        NEW.tag_id_1,
        NEW.tag_id_2,
        'related',
        LEAST(0.9, 0.5 + (NEW.confidence * 0.5)),
        NULL,
        format('Auto-detected: seen together %s times (confidence: %s%%)',
          NEW.count,
          ROUND(NEW.confidence * 100)
        ),
        'pending'
      )
      ON CONFLICT (tag_id_1, tag_id_2, suggested_type) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-promote when co-occurrence is updated
-- Commented out by default - enable if you want real-time promotion
-- CREATE TRIGGER trg_auto_promote_co_occurrence
-- AFTER INSERT OR UPDATE ON tag_co_occurrence
-- FOR EACH ROW
-- EXECUTE FUNCTION check_and_promote_co_occurrence();

-- API endpoint helper: Get co-occurrences ready for promotion
CREATE OR REPLACE FUNCTION get_promotable_co_occurrences(
  p_min_confidence DECIMAL DEFAULT 0.3,
  p_min_count INT DEFAULT 5,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  tag_id_1 UUID,
  tag_id_2 UUID,
  tag_1_name TEXT,
  tag_1_slug TEXT,
  tag_2_name TEXT,
  tag_2_slug TEXT,
  co_occurrence_count INT,
  confidence DECIMAL,
  suggested_strength DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tco.tag_id_1,
    tco.tag_id_2,
    t1.name AS tag_1_name,
    t1.slug AS tag_1_slug,
    t2.name AS tag_2_name,
    t2.slug AS tag_2_slug,
    tco.count AS co_occurrence_count,
    tco.confidence,
    LEAST(0.9, 0.5 + (tco.confidence * 0.5)) AS suggested_strength
  FROM tag_co_occurrence tco
  JOIN tags t1 ON t1.id = tco.tag_id_1
  JOIN tags t2 ON t2.id = tco.tag_id_2
  WHERE tco.confidence >= p_min_confidence
    AND tco.count >= p_min_count
    -- Not already in relationships
    AND NOT EXISTS (
      SELECT 1 FROM tag_relationships tr
      WHERE (tr.tag_id_1 = tco.tag_id_1 AND tr.tag_id_2 = tco.tag_id_2)
         OR (tr.tag_id_1 = tco.tag_id_2 AND tr.tag_id_2 = tco.tag_id_1)
    )
    -- Not already in pending suggestions
    AND NOT EXISTS (
      SELECT 1 FROM tag_relationship_suggestions trs
      WHERE ((trs.tag_id_1 = tco.tag_id_1 AND trs.tag_id_2 = tco.tag_id_2)
         OR (trs.tag_id_1 = tco.tag_id_2 AND trs.tag_id_2 = tco.tag_id_1))
        AND trs.status = 'pending'
    )
  ORDER BY tco.confidence DESC, tco.count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Comments
COMMENT ON FUNCTION promote_co_occurrences_to_suggestions IS 'Batch promote high-confidence co-occurrences to the suggestion queue for curator review';
COMMENT ON FUNCTION check_and_promote_co_occurrence IS 'Trigger function to auto-promote individual co-occurrences when they meet threshold';
COMMENT ON FUNCTION get_promotable_co_occurrences IS 'Get list of co-occurrences eligible for promotion (for admin preview)';
