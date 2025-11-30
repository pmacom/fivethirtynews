-- Migration: Create content_label_assignments junction table
-- Links labels to content items (many-to-many relationship)

CREATE TABLE IF NOT EXISTS content_label_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationships
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES content_labels(id) ON DELETE CASCADE,

  -- Assignment metadata
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),

  -- Optional context for why this label was applied
  note TEXT,

  -- Constraints - one label type per content item
  UNIQUE(content_id, label_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_label_assignments_content ON content_label_assignments(content_id);
CREATE INDEX IF NOT EXISTS idx_label_assignments_label ON content_label_assignments(label_id);
CREATE INDEX IF NOT EXISTS idx_label_assignments_assigned_by ON content_label_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_label_assignments_assigned_at ON content_label_assignments(assigned_at DESC);
