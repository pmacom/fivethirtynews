-- Add tags table for storing reusable additional tags
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Add additional_tags column to content table
ALTER TABLE content
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create index for tag lookups
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_tags_usage ON tags(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_content_tags ON content USING GIN(tags);

-- Insert some common initial tags
INSERT INTO tags (slug, name, usage_count) VALUES
  ('normal-map', 'Normal Map', 0),
  ('depth-map', 'Depth Map', 0),
  ('tutorial', 'Tutorial', 0),
  ('demo', 'Demo', 0),
  ('open-source', 'Open Source', 0),
  ('ai-generated', 'AI Generated', 0),
  ('realtime', 'Realtime', 0),
  ('webgl', 'WebGL', 0),
  ('webgpu', 'WebGPU', 0),
  ('vr', 'VR', 0),
  ('ar', 'AR', 0),
  ('procedural', 'Procedural', 0),
  ('physics', 'Physics', 0),
  ('animation', 'Animation', 0),
  ('particle', 'Particle', 0),
  ('raytracing', 'Raytracing', 0),
  ('pbr', 'PBR', 0),
  ('tool', 'Tool', 0),
  ('library', 'Library', 0),
  ('release', 'Release', 0)
ON CONFLICT (slug) DO NOTHING;
