-- Add community feedback to content relationships
-- Allows users to vote on whether content pairings make sense

-- ============================================================================
-- PART 1: Add feedback columns to content_relationships
-- ============================================================================

-- Community voting aggregates
ALTER TABLE content_relationships ADD COLUMN IF NOT EXISTS
  agree_count INT NOT NULL DEFAULT 0;

ALTER TABLE content_relationships ADD COLUMN IF NOT EXISTS
  disagree_count INT NOT NULL DEFAULT 0;

-- Community score: (agree - disagree) / (total + 1)
ALTER TABLE content_relationships ADD COLUMN IF NOT EXISTS
  community_score DECIMAL(4,3) DEFAULT NULL;

-- Curator override
ALTER TABLE content_relationships ADD COLUMN IF NOT EXISTS
  curator_approved BOOLEAN DEFAULT NULL;

ALTER TABLE content_relationships ADD COLUMN IF NOT EXISTS
  curator_notes TEXT;

-- Index for filtering by community score
CREATE INDEX IF NOT EXISTS idx_content_rel_community_score ON content_relationships(community_score DESC NULLS LAST);

-- ============================================================================
-- PART 2: Content relationship feedback table
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_relationship_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The content pair being voted on
  content_id_1 UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  content_id_2 UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,

  -- Who voted
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Their vote
  vote TEXT NOT NULL CHECK (vote IN ('agree', 'disagree')),

  -- Optional context
  reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One vote per user per content pair
  UNIQUE(content_id_1, content_id_2, user_id),

  -- Ensure ordering matches content_relationships table
  CONSTRAINT content_feedback_pair_order CHECK (content_id_1 < content_id_2)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_feedback_pair ON content_relationship_feedback(content_id_1, content_id_2);
CREATE INDEX IF NOT EXISTS idx_content_feedback_user ON content_relationship_feedback(user_id);

-- ============================================================================
-- PART 3: Trigger to update aggregate counts
-- ============================================================================

CREATE OR REPLACE FUNCTION update_content_relationship_community_score()
RETURNS TRIGGER AS $$
DECLARE
  v_agree INT;
  v_disagree INT;
  v_score DECIMAL;
BEGIN
  -- Determine which content pair to update
  IF TG_OP = 'DELETE' THEN
    SELECT COUNT(*) FILTER (WHERE vote = 'agree'),
           COUNT(*) FILTER (WHERE vote = 'disagree')
    INTO v_agree, v_disagree
    FROM content_relationship_feedback
    WHERE content_id_1 = OLD.content_id_1 AND content_id_2 = OLD.content_id_2;

    -- Calculate score
    IF (v_agree + v_disagree) = 0 THEN
      v_score := NULL;
    ELSE
      v_score := (v_agree::decimal - v_disagree::decimal) / (v_agree + v_disagree + 1);
    END IF;

    UPDATE content_relationships
    SET agree_count = v_agree,
        disagree_count = v_disagree,
        community_score = v_score,
        updated_at = NOW()
    WHERE content_id_1 = OLD.content_id_1 AND content_id_2 = OLD.content_id_2;

    RETURN OLD;
  ELSE
    SELECT COUNT(*) FILTER (WHERE vote = 'agree'),
           COUNT(*) FILTER (WHERE vote = 'disagree')
    INTO v_agree, v_disagree
    FROM content_relationship_feedback
    WHERE content_id_1 = NEW.content_id_1 AND content_id_2 = NEW.content_id_2;

    -- Calculate score
    IF (v_agree + v_disagree) = 0 THEN
      v_score := NULL;
    ELSE
      v_score := (v_agree::decimal - v_disagree::decimal) / (v_agree + v_disagree + 1);
    END IF;

    UPDATE content_relationships
    SET agree_count = v_agree,
        disagree_count = v_disagree,
        community_score = v_score,
        updated_at = NOW()
    WHERE content_id_1 = NEW.content_id_1 AND content_id_2 = NEW.content_id_2;

    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_content_rel_score
AFTER INSERT OR UPDATE OR DELETE ON content_relationship_feedback
FOR EACH ROW
EXECUTE FUNCTION update_content_relationship_community_score();

-- ============================================================================
-- PART 4: Function to get effective content relationship strength
-- ============================================================================

-- Community can adjust strength by ±20%
CREATE OR REPLACE FUNCTION get_effective_content_strength(
  p_base_strength DECIMAL,
  p_community_score DECIMAL,
  p_curator_approved BOOLEAN
)
RETURNS DECIMAL AS $$
DECLARE
  v_community_modifier DECIMAL;
BEGIN
  -- Curator override
  IF p_curator_approved = false THEN
    RETURN 0.0;  -- Curator rejected
  END IF;

  -- Community modifier (±20% influence)
  v_community_modifier := 1.0 + (COALESCE(p_community_score, 0) * 0.2);
  -- Clamp to 0.8-1.2 range
  v_community_modifier := GREATEST(0.8, LEAST(1.2, v_community_modifier));

  RETURN ROUND((p_base_strength * v_community_modifier)::numeric, 3);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- PART 5: Updated get_related_content with feedback filtering
-- ============================================================================

DROP FUNCTION IF EXISTS get_related_content(UUID, DECIMAL, INT);

CREATE OR REPLACE FUNCTION get_related_content(
  p_content_id UUID,
  p_min_strength DECIMAL DEFAULT 0.1,
  p_limit INT DEFAULT 20,
  p_exclude_low_score BOOLEAN DEFAULT true  -- Exclude items with very negative community score
)
RETURNS TABLE (
  content_id UUID,
  total_strength DECIMAL,
  effective_strength DECIMAL,
  navigation_strength DECIMAL,
  search_strength DECIMAL,
  explicit_strength DECIMAL,
  signal_count INT,
  agree_count INT,
  disagree_count INT,
  community_score DECIMAL,
  last_seen TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN cr.content_id_1 = p_content_id THEN cr.content_id_2
      ELSE cr.content_id_1
    END AS content_id,
    cr.total_strength,
    get_effective_content_strength(cr.total_strength, cr.community_score, cr.curator_approved) AS effective_strength,
    cr.navigation_strength,
    cr.search_strength,
    cr.explicit_strength,
    cr.total_signal_count AS signal_count,
    cr.agree_count,
    cr.disagree_count,
    cr.community_score,
    cr.last_seen
  FROM content_relationships cr
  WHERE (cr.content_id_1 = p_content_id OR cr.content_id_2 = p_content_id)
    AND cr.total_strength >= p_min_strength
    AND (cr.curator_approved IS NULL OR cr.curator_approved = true)  -- Not rejected by curator
    AND (NOT p_exclude_low_score OR cr.community_score IS NULL OR cr.community_score > -0.5)  -- Not heavily downvoted
  ORDER BY get_effective_content_strength(cr.total_strength, cr.community_score, cr.curator_approved) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- PART 6: RLS and Permissions
-- ============================================================================

ALTER TABLE content_relationship_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can view feedback
CREATE POLICY "Public read content feedback"
  ON content_relationship_feedback FOR SELECT
  USING (true);

-- Allow all authenticated operations (API handles user validation via session)
-- This app uses Discord auth, not Supabase Auth directly
CREATE POLICY "Allow all content feedback operations"
  ON content_relationship_feedback FOR ALL
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON content_relationship_feedback TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON content_relationship_feedback TO authenticated;
GRANT EXECUTE ON FUNCTION get_effective_content_strength TO anon, authenticated;

-- ============================================================================
-- PART 7: Comments
-- ============================================================================

COMMENT ON TABLE content_relationship_feedback IS 'User votes on content relationship quality';
COMMENT ON COLUMN content_relationships.agree_count IS 'Number of users who agree with this pairing';
COMMENT ON COLUMN content_relationships.disagree_count IS 'Number of users who disagree with this pairing';
COMMENT ON COLUMN content_relationships.community_score IS 'Normalized vote: (agree-disagree)/(total+1)';
COMMENT ON COLUMN content_relationships.curator_approved IS 'Curator override: true=approved, false=hidden, null=no action';
COMMENT ON FUNCTION get_effective_content_strength IS 'Calculate final strength with community modifier (±20%)';
