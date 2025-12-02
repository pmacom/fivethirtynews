-- Migration: Create Channel System
-- Replaces hierarchical tag system with flat channel/group organization
-- Date: 2024-11-27

-- =============================================
-- STEP 1: Create channel_groups table
-- =============================================

CREATE TABLE channel_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_channel_groups_slug ON channel_groups(slug);
CREATE INDEX idx_channel_groups_display_order ON channel_groups(display_order);
CREATE INDEX idx_channel_groups_is_active ON channel_groups(is_active);

-- Enable RLS
ALTER TABLE channel_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public read, admin write
CREATE POLICY "Public read channel_groups" ON channel_groups FOR SELECT USING (true);
CREATE POLICY "Public insert channel_groups" ON channel_groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update channel_groups" ON channel_groups FOR UPDATE USING (true);

COMMENT ON TABLE channel_groups IS 'Top-level channel categories (like Discord categories)';

-- =============================================
-- STEP 2: Create channels table
-- =============================================

CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES channel_groups(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, slug)
);

-- Indexes
CREATE INDEX idx_channels_group_id ON channels(group_id);
CREATE INDEX idx_channels_slug ON channels(slug);
CREATE INDEX idx_channels_display_order ON channels(display_order);
CREATE INDEX idx_channels_is_active ON channels(is_active);

-- Enable RLS
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public read, admin write
CREATE POLICY "Public read channels" ON channels FOR SELECT USING (true);
CREATE POLICY "Public insert channels" ON channels FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update channels" ON channels FOR UPDATE USING (true);

COMMENT ON TABLE channels IS 'Individual channels within groups (like Discord text channels)';

-- =============================================
-- STEP 3: Update content table for channels
-- =============================================

-- Add channels column (array of channel slugs)
ALTER TABLE content ADD COLUMN IF NOT EXISTS channels JSONB DEFAULT '[]'::jsonb;

-- Add primary_channel column
ALTER TABLE content ADD COLUMN IF NOT EXISTS primary_channel TEXT;

-- Create index for channels
CREATE INDEX IF NOT EXISTS idx_content_channels ON content USING GIN(channels);
CREATE INDEX IF NOT EXISTS idx_content_primary_channel ON content(primary_channel);

-- Clear existing tags (as per user decision)
UPDATE content SET tags = '[]'::jsonb WHERE tags IS NOT NULL AND tags != '[]'::jsonb;

COMMENT ON COLUMN content.channels IS 'Array of channel slugs assigned to this content';
COMMENT ON COLUMN content.primary_channel IS 'Primary channel slug for this content';

-- =============================================
-- STEP 4: Seed channel groups
-- =============================================

INSERT INTO channel_groups (slug, name, icon, description, display_order) VALUES
  ('general', 'General', '📢', 'General community channels', 0),
  ('thirddimension', 'ThirdDimension', '🎮', '3D graphics, game engines, and visual development', 1),
  ('ai', 'AI', '🤖', 'Artificial intelligence tools, techniques, and discussions', 2),
  ('code', 'Code', '💻', 'Programming, development, and design', 3),
  ('misc', 'Misc', '🔮', 'Science, technology, and other topics', 4);

-- =============================================
-- STEP 5: Seed channels
-- =============================================

-- General channels
INSERT INTO channels (group_id, slug, name, icon, description, display_order)
SELECT
  g.id,
  c.slug,
  c.name,
  c.icon,
  c.description,
  c.display_order
FROM channel_groups g
CROSS JOIN (VALUES
  ('main-events', 'Main Events', '📣', 'Important announcements, major updates, and community-wide news', 0),
  ('intros', 'Intros', '👋', 'A friendly space for new members to introduce themselves', 1),
  ('jobhunt', 'Job Hunt', '💼', 'Job leads, hiring trends, layoffs, and market insights', 2)
) AS c(slug, name, icon, description, display_order)
WHERE g.slug = 'general';

-- ThirdDimension channels
INSERT INTO channels (group_id, slug, name, icon, description, display_order)
SELECT
  g.id,
  c.slug,
  c.name,
  c.icon,
  c.description,
  c.display_order
FROM channel_groups g
CROSS JOIN (VALUES
  ('3d-models', '3D Models', '📦', 'All things 3D: meshes, AI tools, workflows, and experiments', 0),
  ('blender', 'Blender', '🟠', 'Blender-focused tips, plugins, features, and project discussions', 1),
  ('godot', 'Godot', '🎯', 'Updates, tools, and discussions for Godot developers', 2),
  ('playcanvas', 'PlayCanvas', '🎨', 'PlayCanvas news, techniques, and workflow insights', 3),
  ('splats', 'Splats', '✨', 'Gaussian splats, reconstruction tools, and AI-to-splat workflows', 4),
  ('threejs', 'Three.js', '🔺', 'New libraries, visual techniques, and web-based 3D experiments', 5),
  ('unity', 'Unity', '🔲', 'Unity tools, plugins, features, and troubleshooting', 6),
  ('unreal', 'Unreal', '⬛', 'Unreal Engine updates, tech breakthroughs, and visual experiments', 7),
  ('shaders', 'Shaders', '🌈', 'Shader code, tools, and visual inspiration', 8)
) AS c(slug, name, icon, description, display_order)
WHERE g.slug = 'thirddimension';

-- AI channels
INSERT INTO channels (group_id, slug, name, icon, description, display_order)
SELECT
  g.id,
  c.slug,
  c.name,
  c.icon,
  c.description,
  c.display_order
FROM channel_groups g
CROSS JOIN (VALUES
  ('ai-tips', 'AI Tips', '💡', 'Prompts, workflow tricks, and major AI updates', 0),
  ('art', 'Art', '🖼️', 'Outstanding AI art, generative techniques, and creative tools', 1),
  ('audio', 'Audio', '🎵', 'AI music, sound design tools, and emerging audio technologies', 2),
  ('llm', 'LLM', '🧠', 'New models, benchmarks, and architecture discussions', 3),
  ('showcase', 'Showcase', '🏆', 'Members share creations, experiments, and cool finds', 4),
  ('video', 'Video', '🎬', 'AI video models, generation techniques, and creative examples', 5),
  ('workflows', 'Workflows', '⚡', 'Combined toolchains, pipeline breakdowns, and multi-step AI processes', 6)
) AS c(slug, name, icon, description, display_order)
WHERE g.slug = 'ai';

-- Code channels
INSERT INTO channels (group_id, slug, name, icon, description, display_order)
SELECT
  g.id,
  c.slug,
  c.name,
  c.icon,
  c.description,
  c.display_order
FROM channel_groups g
CROSS JOIN (VALUES
  ('code', 'Code', '👨‍💻', 'Programming, debugging, snippets, and frameworks', 0),
  ('nocode', 'NoCode', '🧩', 'Automation platforms, node-based systems, and visual development', 1),
  ('design', 'Design', '🎨', 'CSS, Tailwind, shadcn, and aesthetic inspiration', 2),
  ('ux', 'UX', '🎯', 'Interaction design, smart patterns, and unique user experiences', 3)
) AS c(slug, name, icon, description, display_order)
WHERE g.slug = 'code';

-- Misc channels
INSERT INTO channels (group_id, slug, name, icon, description, display_order)
SELECT
  g.id,
  c.slug,
  c.name,
  c.icon,
  c.description,
  c.display_order
FROM channel_groups g
CROSS JOIN (VALUES
  ('science', 'Science', '🔬', 'Breakthrough research, technological discoveries', 0),
  ('law', 'Law', '⚖️', 'Legal cases, policies, and regulations shaping AI and tech', 1),
  ('robotics', 'Robotics', '🤖', 'Autonomous machine advancements and robotics news', 2),
  ('medicine', 'Medicine', '🏥', 'Medical breakthroughs, treatments, and biotech progress', 3),
  ('security', 'Security', '🔒', 'Cybersecurity threats, exploits, defenses', 4),
  ('energy', 'Energy', '⚡', 'Power innovations, battery tech, sustainable solutions', 5),
  ('crypto', 'Crypto', '🪙', 'Crypto trends, blockchain developments', 6)
) AS c(slug, name, icon, description, display_order)
WHERE g.slug = 'misc';

-- =============================================
-- STEP 6: Create updated_at triggers
-- =============================================

CREATE OR REPLACE FUNCTION update_channel_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER channel_groups_updated_at_trigger
  BEFORE UPDATE ON channel_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_channel_groups_updated_at();

CREATE OR REPLACE FUNCTION update_channels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER channels_updated_at_trigger
  BEFORE UPDATE ON channels
  FOR EACH ROW
  EXECUTE FUNCTION update_channels_updated_at();
