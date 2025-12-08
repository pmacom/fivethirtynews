-- Add user feedback system for tag relationships
-- Allows users to vote on relationship quality, curators to review suggestions

-- ============================================================================
-- PART 1: Extend tag_relationships with status and community signals
-- ============================================================================

-- Status for curator workflow
ALTER TABLE tag_relationships ADD COLUMN IF NOT EXISTS
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'suggested',   -- Auto-detected or user-suggested, awaiting review
    'active',      -- Curator-approved or manually created
    'deprecated',  -- Marked for removal but kept for history
    'rejected'     -- Explicitly rejected by curator
  ));

-- Community voting aggregates
ALTER TABLE tag_relationships ADD COLUMN IF NOT EXISTS
  agree_count INT NOT NULL DEFAULT 0;

ALTER TABLE tag_relationships ADD COLUMN IF NOT EXISTS
  disagree_count INT NOT NULL DEFAULT 0;

-- Normalized community score: (agree - disagree) / (agree + disagree + 1)
-- Range: -1.0 to 1.0, NULL means no votes yet
ALTER TABLE tag_relationships ADD COLUMN IF NOT EXISTS
  community_score DECIMAL(4,3) DEFAULT NULL;

-- Curator oversight fields
ALTER TABLE tag_relationships ADD COLUMN IF NOT EXISTS
  curator_approved_by UUID REFERENCES auth.users(id);

ALTER TABLE tag_relationships ADD COLUMN IF NOT EXISTS
  curator_approved_at TIMESTAMPTZ;

ALTER TABLE tag_relationships ADD COLUMN IF NOT EXISTS
  curator_notes TEXT;

-- Track how relationship was created
ALTER TABLE tag_relationships ADD COLUMN IF NOT EXISTS
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN (
    'manual',        -- Curator created directly
    'co_occurrence', -- Auto-detected from tag usage patterns
    'user_suggested' -- User proposed via suggestion system
  ));

-- Index for filtering by status (common in curator views)
CREATE INDEX IF NOT EXISTS idx_tag_relationships_status ON tag_relationships(status);
CREATE INDEX IF NOT EXISTS idx_tag_relationships_source ON tag_relationships(source);
CREATE INDEX IF NOT EXISTS idx_tag_relationships_community_score ON tag_relationships(community_score DESC NULLS LAST);

-- ============================================================================
-- PART 2: User feedback on tag relationships
-- ============================================================================

CREATE TABLE IF NOT EXISTS tag_relationship_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What they're voting on (existing relationship)
  tag_relationship_id UUID REFERENCES tag_relationships(id) ON DELETE CASCADE,

  -- OR voting on a suggested pair not yet in tag_relationships
  tag_id_1 UUID REFERENCES tags(id) ON DELETE CASCADE,
  tag_id_2 UUID REFERENCES tags(id) ON DELETE CASCADE,

  -- Who voted
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Their vote
  vote TEXT NOT NULL CHECK (vote IN ('agree', 'disagree', 'unsure')),

  -- If suggesting a relationship type for unlinked tags
  suggested_type TEXT CHECK (suggested_type IN ('related', 'tool_of', 'technique_of', 'part_of')),

  -- Optional reason for vote
  reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One vote per user per existing relationship
  CONSTRAINT unique_user_vote_relationship UNIQUE(tag_relationship_id, user_id),

  -- One vote per user per tag pair (when suggesting)
  CONSTRAINT unique_user_vote_tag_pair UNIQUE(tag_id_1, tag_id_2, user_id),

  -- Must have either relationship_id OR both tag_ids
  CONSTRAINT valid_vote_target CHECK (
    (tag_relationship_id IS NOT NULL AND tag_id_1 IS NULL AND tag_id_2 IS NULL)
    OR
    (tag_relationship_id IS NULL AND tag_id_1 IS NOT NULL AND tag_id_2 IS NOT NULL)
  )
);

-- Indexes for lookup
CREATE INDEX IF NOT EXISTS idx_feedback_relationship ON tag_relationship_feedback(tag_relationship_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON tag_relationship_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_tag_pair ON tag_relationship_feedback(tag_id_1, tag_id_2);

-- ============================================================================
-- PART 3: Suggestion queue for pending relationships
-- ============================================================================

CREATE TABLE IF NOT EXISTS tag_relationship_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The proposed tag pair
  tag_id_1 UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  tag_id_2 UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,

  -- Proposed relationship details
  suggested_type TEXT NOT NULL CHECK (suggested_type IN ('related', 'tool_of', 'technique_of', 'part_of')),
  suggested_strength DECIMAL(3,2) DEFAULT 0.7 CHECK (suggested_strength >= 0.0 AND suggested_strength <= 1.0),

  -- Who suggested (NULL = auto-detected from co-occurrence)
  suggested_by UUID REFERENCES auth.users(id),
  suggestion_reason TEXT,

  -- Community pre-voting before curator review
  agree_count INT NOT NULL DEFAULT 0,
  disagree_count INT NOT NULL DEFAULT 0,

  -- Resolution status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',   -- Awaiting curator review
    'approved',  -- Accepted, relationship created
    'rejected',  -- Declined by curator
    'merged'     -- Combined with existing relationship
  )),

  -- Curator resolution
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- Link to created relationship if approved
  created_relationship_id UUID REFERENCES tag_relationships(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate suggestions
  CONSTRAINT unique_suggestion UNIQUE(tag_id_1, tag_id_2, suggested_type),

  -- Prevent self-suggestions
  CONSTRAINT no_self_suggestion CHECK (tag_id_1 != tag_id_2)
);

-- Indexes for curator queue
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON tag_relationship_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_pending ON tag_relationship_suggestions(status, agree_count DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_suggestions_tags ON tag_relationship_suggestions(tag_id_1, tag_id_2);

-- ============================================================================
-- PART 4: Functions to update aggregates
-- ============================================================================

-- Update community score when feedback changes
CREATE OR REPLACE FUNCTION update_relationship_community_score()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    -- Update old relationship if it exists
    IF OLD.tag_relationship_id IS NOT NULL THEN
      UPDATE tag_relationships
      SET
        agree_count = (SELECT COUNT(*) FROM tag_relationship_feedback WHERE tag_relationship_id = OLD.tag_relationship_id AND vote = 'agree'),
        disagree_count = (SELECT COUNT(*) FROM tag_relationship_feedback WHERE tag_relationship_id = OLD.tag_relationship_id AND vote = 'disagree'),
        community_score = CASE
          WHEN (SELECT COUNT(*) FROM tag_relationship_feedback WHERE tag_relationship_id = OLD.tag_relationship_id AND vote IN ('agree', 'disagree')) = 0 THEN NULL
          ELSE (
            (SELECT COUNT(*)::decimal FROM tag_relationship_feedback WHERE tag_relationship_id = OLD.tag_relationship_id AND vote = 'agree') -
            (SELECT COUNT(*)::decimal FROM tag_relationship_feedback WHERE tag_relationship_id = OLD.tag_relationship_id AND vote = 'disagree')
          ) / (
            (SELECT COUNT(*)::decimal FROM tag_relationship_feedback WHERE tag_relationship_id = OLD.tag_relationship_id AND vote IN ('agree', 'disagree')) + 1
          )
        END
      WHERE id = OLD.tag_relationship_id;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Update new relationship if it exists
    IF NEW.tag_relationship_id IS NOT NULL THEN
      UPDATE tag_relationships
      SET
        agree_count = (SELECT COUNT(*) FROM tag_relationship_feedback WHERE tag_relationship_id = NEW.tag_relationship_id AND vote = 'agree'),
        disagree_count = (SELECT COUNT(*) FROM tag_relationship_feedback WHERE tag_relationship_id = NEW.tag_relationship_id AND vote = 'disagree'),
        community_score = CASE
          WHEN (SELECT COUNT(*) FROM tag_relationship_feedback WHERE tag_relationship_id = NEW.tag_relationship_id AND vote IN ('agree', 'disagree')) = 0 THEN NULL
          ELSE (
            (SELECT COUNT(*)::decimal FROM tag_relationship_feedback WHERE tag_relationship_id = NEW.tag_relationship_id AND vote = 'agree') -
            (SELECT COUNT(*)::decimal FROM tag_relationship_feedback WHERE tag_relationship_id = NEW.tag_relationship_id AND vote = 'disagree')
          ) / (
            (SELECT COUNT(*)::decimal FROM tag_relationship_feedback WHERE tag_relationship_id = NEW.tag_relationship_id AND vote IN ('agree', 'disagree')) + 1
          )
        END
      WHERE id = NEW.tag_relationship_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_relationship_score
AFTER INSERT OR UPDATE OR DELETE ON tag_relationship_feedback
FOR EACH ROW
EXECUTE FUNCTION update_relationship_community_score();

-- Update suggestion vote counts
CREATE OR REPLACE FUNCTION update_suggestion_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
  v_suggestion_id UUID;
BEGIN
  -- Find matching suggestion for this tag pair
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    IF OLD.tag_id_1 IS NOT NULL AND OLD.tag_id_2 IS NOT NULL THEN
      SELECT id INTO v_suggestion_id
      FROM tag_relationship_suggestions
      WHERE tag_id_1 = OLD.tag_id_1 AND tag_id_2 = OLD.tag_id_2
         OR tag_id_1 = OLD.tag_id_2 AND tag_id_2 = OLD.tag_id_1;

      IF v_suggestion_id IS NOT NULL THEN
        UPDATE tag_relationship_suggestions
        SET
          agree_count = (SELECT COUNT(*) FROM tag_relationship_feedback
            WHERE (tag_id_1 = OLD.tag_id_1 AND tag_id_2 = OLD.tag_id_2 OR tag_id_1 = OLD.tag_id_2 AND tag_id_2 = OLD.tag_id_1)
            AND vote = 'agree'),
          disagree_count = (SELECT COUNT(*) FROM tag_relationship_feedback
            WHERE (tag_id_1 = OLD.tag_id_1 AND tag_id_2 = OLD.tag_id_2 OR tag_id_1 = OLD.tag_id_2 AND tag_id_2 = OLD.tag_id_1)
            AND vote = 'disagree')
        WHERE id = v_suggestion_id;
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.tag_id_1 IS NOT NULL AND NEW.tag_id_2 IS NOT NULL THEN
      SELECT id INTO v_suggestion_id
      FROM tag_relationship_suggestions
      WHERE tag_id_1 = NEW.tag_id_1 AND tag_id_2 = NEW.tag_id_2
         OR tag_id_1 = NEW.tag_id_2 AND tag_id_2 = NEW.tag_id_1;

      IF v_suggestion_id IS NOT NULL THEN
        UPDATE tag_relationship_suggestions
        SET
          agree_count = (SELECT COUNT(*) FROM tag_relationship_feedback
            WHERE (tag_id_1 = NEW.tag_id_1 AND tag_id_2 = NEW.tag_id_2 OR tag_id_1 = NEW.tag_id_2 AND tag_id_2 = NEW.tag_id_1)
            AND vote = 'agree'),
          disagree_count = (SELECT COUNT(*) FROM tag_relationship_feedback
            WHERE (tag_id_1 = NEW.tag_id_1 AND tag_id_2 = NEW.tag_id_2 OR tag_id_1 = NEW.tag_id_2 AND tag_id_2 = NEW.tag_id_1)
            AND vote = 'disagree')
        WHERE id = v_suggestion_id;
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_suggestion_votes
AFTER INSERT OR UPDATE OR DELETE ON tag_relationship_feedback
FOR EACH ROW
EXECUTE FUNCTION update_suggestion_vote_counts();

-- ============================================================================
-- PART 5: Calculate effective relationship strength
-- ============================================================================

-- Function to get effective strength accounting for community feedback
-- Formula: base_strength * curator_multiplier * community_modifier
-- curator_multiplier: 1.0 (active), 0.5 (deprecated), 0.0 (rejected)
-- community_modifier: 1.0 + (community_score * 0.2), range 0.8 to 1.2
CREATE OR REPLACE FUNCTION get_effective_relationship_strength(
  p_base_strength DECIMAL,
  p_status TEXT,
  p_community_score DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  v_curator_multiplier DECIMAL;
  v_community_modifier DECIMAL;
BEGIN
  -- Curator multiplier based on status
  v_curator_multiplier := CASE p_status
    WHEN 'active' THEN 1.0
    WHEN 'suggested' THEN 0.8  -- Lower weight for unreviewed
    WHEN 'deprecated' THEN 0.5
    WHEN 'rejected' THEN 0.0
    ELSE 1.0
  END;

  -- Community modifier (±20% influence)
  v_community_modifier := 1.0 + (COALESCE(p_community_score, 0) * 0.2);
  -- Clamp to 0.8-1.2 range
  v_community_modifier := GREATEST(0.8, LEAST(1.2, v_community_modifier));

  RETURN ROUND((p_base_strength * v_curator_multiplier * v_community_modifier)::numeric, 3);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- PART 6: Updated get_related_tags with status filtering
-- ============================================================================

-- Drop and recreate to add status filtering
DROP FUNCTION IF EXISTS get_related_tags(UUID, DECIMAL, TEXT);

CREATE OR REPLACE FUNCTION get_related_tags(
  p_tag_id UUID,
  p_min_strength DECIMAL DEFAULT 0.5,
  p_relationship_type TEXT DEFAULT NULL,
  p_include_suggested BOOLEAN DEFAULT false
)
RETURNS TABLE (
  tag_id UUID,
  tag_name TEXT,
  tag_slug TEXT,
  relationship_type TEXT,
  strength DECIMAL,
  effective_strength DECIMAL,
  direction TEXT,
  status TEXT,
  community_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  -- Outbound relationships (tag_id_1 -> tag_id_2)
  SELECT
    t.id AS tag_id,
    t.name AS tag_name,
    t.slug AS tag_slug,
    tr.relationship_type,
    tr.strength,
    get_effective_relationship_strength(tr.strength, tr.status, tr.community_score) AS effective_strength,
    'outbound'::TEXT AS direction,
    tr.status,
    tr.community_score
  FROM tag_relationships tr
  JOIN tags t ON t.id = tr.tag_id_2
  WHERE tr.tag_id_1 = p_tag_id
    AND tr.strength >= p_min_strength
    AND (p_relationship_type IS NULL OR tr.relationship_type = p_relationship_type)
    AND (tr.status = 'active' OR (p_include_suggested AND tr.status = 'suggested'))

  UNION ALL

  -- Inbound relationships (for symmetric 'related' type)
  SELECT
    t.id AS tag_id,
    t.name AS tag_name,
    t.slug AS tag_slug,
    tr.relationship_type,
    tr.strength,
    get_effective_relationship_strength(tr.strength, tr.status, tr.community_score) AS effective_strength,
    'inbound'::TEXT AS direction,
    tr.status,
    tr.community_score
  FROM tag_relationships tr
  JOIN tags t ON t.id = tr.tag_id_1
  WHERE tr.tag_id_2 = p_tag_id
    AND tr.strength >= p_min_strength
    AND tr.relationship_type = 'related'
    AND (p_relationship_type IS NULL OR tr.relationship_type = p_relationship_type)
    AND (tr.status = 'active' OR (p_include_suggested AND tr.status = 'suggested'))

  ORDER BY effective_strength DESC, tag_name;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- PART 7: Permissions
-- ============================================================================

-- Feedback table permissions
GRANT SELECT ON tag_relationship_feedback TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON tag_relationship_feedback TO authenticated;

-- Suggestions table permissions
GRANT SELECT ON tag_relationship_suggestions TO anon, authenticated;
GRANT INSERT ON tag_relationship_suggestions TO authenticated;
-- Only allow update/delete for curators (handled by RLS)
GRANT UPDATE, DELETE ON tag_relationship_suggestions TO authenticated;

-- RLS for feedback (users can only modify their own votes)
ALTER TABLE tag_relationship_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all feedback"
  ON tag_relationship_feedback FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own feedback"
  ON tag_relationship_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback"
  ON tag_relationship_feedback FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own feedback"
  ON tag_relationship_feedback FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS for suggestions
ALTER TABLE tag_relationship_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view suggestions"
  ON tag_relationship_suggestions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create suggestions"
  ON tag_relationship_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = suggested_by OR suggested_by IS NULL);

-- Curators can update/delete suggestions (TODO: add curator role check)
CREATE POLICY "Authenticated users can update suggestions"
  ON tag_relationship_suggestions FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete suggestions"
  ON tag_relationship_suggestions FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- PART 8: Comments
-- ============================================================================

COMMENT ON TABLE tag_relationship_feedback IS 'User votes on tag relationship quality';
COMMENT ON TABLE tag_relationship_suggestions IS 'Queue of proposed tag relationships pending curator review';
COMMENT ON COLUMN tag_relationships.status IS 'Workflow status: suggested (pending), active (approved), deprecated, rejected';
COMMENT ON COLUMN tag_relationships.community_score IS 'Normalized community vote: (agree-disagree)/(total+1), range -1 to 1';
COMMENT ON COLUMN tag_relationships.source IS 'How relationship was created: manual, co_occurrence, user_suggested';
COMMENT ON FUNCTION get_effective_relationship_strength IS 'Calculate final strength: base * curator_multiplier * community_modifier (±20%)';
