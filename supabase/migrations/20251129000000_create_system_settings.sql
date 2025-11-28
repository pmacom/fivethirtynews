-- System settings table for global feature flags
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public read, admin write (enforced via API)
CREATE POLICY "Public read system_settings" ON system_settings
  FOR SELECT USING (true);
CREATE POLICY "Public write system_settings" ON system_settings
  FOR ALL USING (true);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER system_settings_updated_at_trigger
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();

-- Seed default settings
INSERT INTO system_settings (key, value, description) VALUES
  ('broadcast_on_approval', 'false'::jsonb, 'When true, approved content is automatically broadcast to Discord channels')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE system_settings IS 'Global system configuration and feature flags';
