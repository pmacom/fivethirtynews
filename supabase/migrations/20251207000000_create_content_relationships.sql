-- Content Relationship System
-- Tracks relationships between content items based on user behavior signals
-- Supports: navigation patterns, search context, explicit linking

-- ============================================================================
-- Signal Log Table (append-only for audit and analysis)
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_relationship_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source and target content (directional signal: user went from source to target)
  source_content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  target_content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,

  -- Signal type determines weight contribution
  -- 'navigation': User viewed source then navigated to target (weight: 0.3)
  -- 'search': User searched while on source, selected target (weight: 0.5)
  -- 'explicit': User manually linked source to target (weight: 1.0)
  signal_type TEXT NOT NULL CHECK (signal_type IN ('navigation', 'search', 'explicit')),

  -- Base weight for this signal (can be adjusted)
  weight DECIMAL(3,2) NOT NULL DEFAULT 1.0 CHECK (weight >= 0.0 AND weight <= 1.0),

  -- Optional context (e.g., search query, session info)
  context JSONB DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Prevent self-reference
  CONSTRAINT no_self_signal CHECK (source_content_id != target_content_id)
);

-- Indexes for signal log
CREATE INDEX IF NOT EXISTS idx_content_signals_source ON content_relationship_signals(source_content_id);
CREATE INDEX IF NOT EXISTS idx_content_signals_target ON content_relationship_signals(target_content_id);
CREATE INDEX IF NOT EXISTS idx_content_signals_type ON content_relationship_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_content_signals_created ON content_relationship_signals(created_at DESC);

COMMENT ON TABLE content_relationship_signals IS 'Append-only log of relationship signals between content items for audit and analysis';

-- ============================================================================
-- Aggregated Relationships Table (for fast queries)
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content pair (normalized: content_id_1 < content_id_2 to prevent duplicates)
  content_id_1 UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  content_id_2 UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,

  -- Aggregated strength scores by signal type (0.0 to 1.0 scale)
  navigation_strength DECIMAL(4,3) NOT NULL DEFAULT 0.0 CHECK (navigation_strength >= 0.0 AND navigation_strength <= 1.0),
  search_strength DECIMAL(4,3) NOT NULL DEFAULT 0.0 CHECK (search_strength >= 0.0 AND search_strength <= 1.0),
  explicit_strength DECIMAL(4,3) NOT NULL DEFAULT 0.0 CHECK (explicit_strength >= 0.0 AND explicit_strength <= 1.0),

  -- Combined weighted score: (nav*0.3 + search*0.5 + explicit*1.0) / 1.8, normalized to 0-1
  total_strength DECIMAL(4,3) NOT NULL DEFAULT 0.0 CHECK (total_strength >= 0.0 AND total_strength <= 1.0),

  -- Signal counts for analysis
  navigation_count INT NOT NULL DEFAULT 0,
  search_count INT NOT NULL DEFAULT 0,
  explicit_count INT NOT NULL DEFAULT 0,
  total_signal_count INT NOT NULL DEFAULT 0,

  -- Timestamps
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT content_pair_order CHECK (content_id_1 < content_id_2),
  UNIQUE(content_id_1, content_id_2)
);

-- Indexes for fast relationship queries
CREATE INDEX IF NOT EXISTS idx_content_rel_id1_strength ON content_relationships(content_id_1, total_strength DESC);
CREATE INDEX IF NOT EXISTS idx_content_rel_id2_strength ON content_relationships(content_id_2, total_strength DESC);
CREATE INDEX IF NOT EXISTS idx_content_rel_total_strength ON content_relationships(total_strength DESC);
CREATE INDEX IF NOT EXISTS idx_content_rel_last_seen ON content_relationships(last_seen DESC);

COMMENT ON TABLE content_relationships IS 'Pre-aggregated relationship scores between content pairs for fast queries';
COMMENT ON COLUMN content_relationships.total_strength IS 'Weighted combination: (navigation*0.3 + search*0.5 + explicit*1.0) / 1.8';

-- ============================================================================
-- Function: Record Content Signal
-- ============================================================================

CREATE OR REPLACE FUNCTION record_content_signal(
  p_source_id UUID,
  p_target_id UUID,
  p_signal_type TEXT,
  p_weight DECIMAL DEFAULT 1.0,
  p_context JSONB DEFAULT '{}',
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_signal_id UUID;
  v_content_id_1 UUID;
  v_content_id_2 UUID;
  v_increment DECIMAL;
BEGIN
  -- Validate signal type
  IF p_signal_type NOT IN ('navigation', 'search', 'explicit') THEN
    RAISE EXCEPTION 'Invalid signal_type: %. Must be navigation, search, or explicit', p_signal_type;
  END IF;

  -- Prevent self-reference
  IF p_source_id = p_target_id THEN
    RETURN NULL;
  END IF;

  -- Insert signal into log
  INSERT INTO content_relationship_signals (
    source_content_id, target_content_id, signal_type, weight, context, user_id
  ) VALUES (
    p_source_id, p_target_id, p_signal_type, p_weight, p_context, p_user_id
  )
  RETURNING id INTO v_signal_id;

  -- Normalize content IDs for aggregation (smaller UUID first)
  v_content_id_1 := LEAST(p_source_id, p_target_id);
  v_content_id_2 := GREATEST(p_source_id, p_target_id);

  -- Calculate increment based on signal type (diminishing returns)
  v_increment := CASE p_signal_type
    WHEN 'navigation' THEN 0.05  -- Small increments
    WHEN 'search' THEN 0.10      -- Medium increments
    WHEN 'explicit' THEN 0.25    -- Large increments
  END * p_weight;

  -- Upsert aggregated relationship
  INSERT INTO content_relationships (
    content_id_1,
    content_id_2,
    navigation_strength,
    search_strength,
    explicit_strength,
    navigation_count,
    search_count,
    explicit_count,
    total_signal_count,
    first_seen,
    last_seen
  ) VALUES (
    v_content_id_1,
    v_content_id_2,
    CASE WHEN p_signal_type = 'navigation' THEN LEAST(1.0, v_increment) ELSE 0 END,
    CASE WHEN p_signal_type = 'search' THEN LEAST(1.0, v_increment) ELSE 0 END,
    CASE WHEN p_signal_type = 'explicit' THEN LEAST(1.0, v_increment) ELSE 0 END,
    CASE WHEN p_signal_type = 'navigation' THEN 1 ELSE 0 END,
    CASE WHEN p_signal_type = 'search' THEN 1 ELSE 0 END,
    CASE WHEN p_signal_type = 'explicit' THEN 1 ELSE 0 END,
    1,
    NOW(),
    NOW()
  )
  ON CONFLICT (content_id_1, content_id_2) DO UPDATE SET
    navigation_strength = LEAST(1.0, content_relationships.navigation_strength +
      CASE WHEN p_signal_type = 'navigation' THEN v_increment ELSE 0 END),
    search_strength = LEAST(1.0, content_relationships.search_strength +
      CASE WHEN p_signal_type = 'search' THEN v_increment ELSE 0 END),
    explicit_strength = LEAST(1.0, content_relationships.explicit_strength +
      CASE WHEN p_signal_type = 'explicit' THEN v_increment ELSE 0 END),
    navigation_count = content_relationships.navigation_count +
      CASE WHEN p_signal_type = 'navigation' THEN 1 ELSE 0 END,
    search_count = content_relationships.search_count +
      CASE WHEN p_signal_type = 'search' THEN 1 ELSE 0 END,
    explicit_count = content_relationships.explicit_count +
      CASE WHEN p_signal_type = 'explicit' THEN 1 ELSE 0 END,
    total_signal_count = content_relationships.total_signal_count + 1,
    last_seen = NOW(),
    updated_at = NOW();

  -- Update total_strength (weighted combination normalized to 0-1)
  UPDATE content_relationships
  SET total_strength = LEAST(1.0, (
    navigation_strength * 0.3 +
    search_strength * 0.5 +
    explicit_strength * 1.0
  ) / 1.8)
  WHERE content_id_1 = v_content_id_1 AND content_id_2 = v_content_id_2;

  RETURN v_signal_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION record_content_signal IS 'Record a relationship signal and update aggregated scores. Returns signal ID.';

-- ============================================================================
-- Function: Get Related Content
-- ============================================================================

CREATE OR REPLACE FUNCTION get_related_content(
  p_content_id UUID,
  p_min_strength DECIMAL DEFAULT 0.1,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  content_id UUID,
  total_strength DECIMAL,
  navigation_strength DECIMAL,
  search_strength DECIMAL,
  explicit_strength DECIMAL,
  signal_count INT,
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
    cr.navigation_strength,
    cr.search_strength,
    cr.explicit_strength,
    cr.total_signal_count AS signal_count,
    cr.last_seen
  FROM content_relationships cr
  WHERE (cr.content_id_1 = p_content_id OR cr.content_id_2 = p_content_id)
    AND cr.total_strength >= p_min_strength
  ORDER BY cr.total_strength DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_related_content IS 'Find content related to a given content item, ordered by relationship strength';

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE content_relationship_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_relationships ENABLE ROW LEVEL SECURITY;

-- Anyone can read signals and relationships
CREATE POLICY "Public read signals" ON content_relationship_signals FOR SELECT USING (true);
CREATE POLICY "Public read relationships" ON content_relationships FOR SELECT USING (true);

-- Anyone can insert signals (relationship tracking is anonymous-friendly)
CREATE POLICY "Anyone can insert signals" ON content_relationship_signals FOR INSERT WITH CHECK (true);

-- Only the function should update relationships (via SECURITY DEFINER if needed)
-- For now, allow any updates to relationships table
CREATE POLICY "Anyone can update relationships" ON content_relationships FOR ALL USING (true);

-- ============================================================================
-- Grants
-- ============================================================================

GRANT SELECT ON content_relationship_signals TO anon, authenticated;
GRANT INSERT ON content_relationship_signals TO anon, authenticated;
GRANT SELECT ON content_relationships TO anon, authenticated;
GRANT EXECUTE ON FUNCTION record_content_signal TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_related_content TO anon, authenticated;
