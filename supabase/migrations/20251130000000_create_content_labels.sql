-- Migration: Create content_labels table for moderator badge/label system
-- This table stores the available labels that moderators can assign to content

CREATE TABLE IF NOT EXISTS content_labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Label definition
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Visual styling
  color TEXT DEFAULT '#6366f1',
  text_color TEXT DEFAULT '#ffffff',
  icon TEXT,

  -- Categorization
  category TEXT DEFAULT 'general' CHECK (category IN ('status', 'importance', 'type', 'general', 'custom')),

  -- Permissions & status
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Creator tracking
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_labels_slug ON content_labels(slug);
CREATE INDEX IF NOT EXISTS idx_content_labels_category ON content_labels(category);
CREATE INDEX IF NOT EXISTS idx_content_labels_active ON content_labels(is_active) WHERE is_active = true;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_content_labels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_content_labels_updated_at ON content_labels;
CREATE TRIGGER trigger_content_labels_updated_at
  BEFORE UPDATE ON content_labels
  FOR EACH ROW
  EXECUTE FUNCTION update_content_labels_updated_at();

-- Seed system labels
INSERT INTO content_labels (slug, name, color, text_color, icon, category, is_system) VALUES
  ('improvement', 'Improvement', '#22c55e', '#ffffff', 'trending-up', 'status', true),
  ('new', 'New', '#3b82f6', '#ffffff', 'sparkles', 'status', true),
  ('take-note', 'Take Note!', '#f59e0b', '#000000', 'alert-circle', 'importance', true),
  ('breaking', 'Breaking', '#ef4444', '#ffffff', 'zap', 'importance', true),
  ('tutorial', 'Tutorial', '#8b5cf6', '#ffffff', 'book-open', 'type', true),
  ('demo', 'Demo', '#06b6d4', '#ffffff', 'play', 'type', true),
  ('discussion', 'Discussion', '#ec4899', '#ffffff', 'message-circle', 'type', true),
  ('tool', 'Tool', '#14b8a6', '#ffffff', 'wrench', 'type', true)
ON CONFLICT (slug) DO NOTHING;
