-- =============================================
-- Shows System Migration
-- Creates shows, show_members, show_schedule_exceptions tables
-- and extends the episodes table
-- =============================================

-- =============================================
-- STEP 1: Create shows table
-- =============================================

CREATE TABLE shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,

  -- Schedule (structured for complex patterns)
  schedule_frequency TEXT CHECK (schedule_frequency IN ('weekly', 'biweekly', 'monthly', 'custom')),
  schedule_day_of_week INTEGER CHECK (schedule_day_of_week >= 0 AND schedule_day_of_week <= 6),
  schedule_week_of_month INTEGER, -- For monthly: 1st, 2nd, 3rd, 4th, -1 for last
  schedule_time TIME,
  schedule_timezone TEXT DEFAULT 'America/New_York',
  schedule_text TEXT, -- Human-readable: "Every Wednesday at 5:30 PM EST"
  duration_minutes INTEGER DEFAULT 60,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'hiatus', 'archived')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for shows
CREATE INDEX idx_shows_slug ON shows(slug);
CREATE INDEX idx_shows_status ON shows(status);
CREATE INDEX idx_shows_created_by ON shows(created_by);

-- RLS for shows
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read shows" ON shows FOR SELECT USING (true);
CREATE POLICY "Authenticated insert shows" ON shows FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated update shows" ON shows FOR UPDATE USING (true);
CREATE POLICY "Authenticated delete shows" ON shows FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_shows_updated_at
  BEFORE UPDATE ON shows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- STEP 2: Create show_role enum and show_members table
-- =============================================

CREATE TYPE show_role AS ENUM ('showrunner', 'cohost', 'producer', 'moderator', 'guest');

CREATE TABLE show_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role show_role NOT NULL,

  -- Permissions (set by trigger based on role, can be overridden)
  can_manage_members BOOLEAN DEFAULT false,
  can_manage_show BOOLEAN DEFAULT false,
  can_create_episodes BOOLEAN DEFAULT false,

  display_order INTEGER DEFAULT 0,
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(show_id, user_id)
);

-- Indexes for show_members
CREATE INDEX idx_show_members_show_id ON show_members(show_id);
CREATE INDEX idx_show_members_user_id ON show_members(user_id);
CREATE INDEX idx_show_members_role ON show_members(role);

-- RLS for show_members
ALTER TABLE show_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read show_members" ON show_members FOR SELECT USING (true);
CREATE POLICY "Authenticated insert show_members" ON show_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated update show_members" ON show_members FOR UPDATE USING (true);
CREATE POLICY "Authenticated delete show_members" ON show_members FOR DELETE USING (true);

-- Trigger to automatically set permissions based on role
CREATE OR REPLACE FUNCTION set_show_member_permissions()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.role
    WHEN 'showrunner' THEN
      NEW.can_manage_members := true;
      NEW.can_manage_show := true;
      NEW.can_create_episodes := true;
    WHEN 'cohost' THEN
      NEW.can_manage_members := false;
      NEW.can_manage_show := false;
      NEW.can_create_episodes := true;
    WHEN 'producer' THEN
      NEW.can_manage_members := true;
      NEW.can_manage_show := true;
      NEW.can_create_episodes := true;
    WHEN 'moderator' THEN
      NEW.can_manage_members := false;
      NEW.can_manage_show := false;
      NEW.can_create_episodes := false;
    WHEN 'guest' THEN
      NEW.can_manage_members := false;
      NEW.can_manage_show := false;
      NEW.can_create_episodes := false;
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_permissions_on_insert
  BEFORE INSERT ON show_members
  FOR EACH ROW
  EXECUTE FUNCTION set_show_member_permissions();

CREATE TRIGGER set_permissions_on_update
  BEFORE UPDATE OF role ON show_members
  FOR EACH ROW
  EXECUTE FUNCTION set_show_member_permissions();

-- =============================================
-- STEP 3: Create show_schedule_exceptions table
-- =============================================

CREATE TABLE show_schedule_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  original_date DATE NOT NULL,
  exception_type TEXT NOT NULL CHECK (exception_type IN ('cancelled', 'rescheduled', 'special')),
  new_datetime TIMESTAMPTZ, -- For rescheduled episodes
  reason TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for show_schedule_exceptions
CREATE INDEX idx_show_schedule_exceptions_show_id ON show_schedule_exceptions(show_id);
CREATE INDEX idx_show_schedule_exceptions_original_date ON show_schedule_exceptions(original_date);

-- RLS for show_schedule_exceptions
ALTER TABLE show_schedule_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read exceptions" ON show_schedule_exceptions FOR SELECT USING (true);
CREATE POLICY "Authenticated insert exceptions" ON show_schedule_exceptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated update exceptions" ON show_schedule_exceptions FOR UPDATE USING (true);
CREATE POLICY "Authenticated delete exceptions" ON show_schedule_exceptions FOR DELETE USING (true);

-- =============================================
-- STEP 4: Extend episodes table with show-related columns
-- =============================================

-- Add show_id to link episodes to shows
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS show_id UUID REFERENCES shows(id) ON DELETE SET NULL;

-- Add episode_number for per-show numbering
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS episode_number INTEGER;

-- Add scheduled_at for when the episode is scheduled
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- Add status for episode lifecycle
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled'
  CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled'));

-- Add created_by to track who created the episode
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_episodes_show_id ON episodes(show_id);
CREATE INDEX IF NOT EXISTS idx_episodes_status ON episodes(status);
CREATE INDEX IF NOT EXISTS idx_episodes_scheduled_at ON episodes(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_episodes_episode_number ON episodes(episode_number);

-- =============================================
-- STEP 5: Helper function to get user's show permissions
-- =============================================

CREATE OR REPLACE FUNCTION get_user_show_permissions(p_user_id UUID, p_show_id UUID)
RETURNS TABLE(
  can_manage_members BOOLEAN,
  can_manage_show BOOLEAN,
  can_create_episodes BOOLEAN,
  is_site_admin BOOLEAN,
  role show_role
) AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_is_moderator BOOLEAN;
BEGIN
  -- Check if user is site admin or moderator
  SELECT u.is_admin, u.is_moderator INTO v_is_admin, v_is_moderator
  FROM users u WHERE u.id = p_user_id;

  -- If site admin or moderator, return full permissions
  IF v_is_admin OR v_is_moderator THEN
    RETURN QUERY SELECT true, true, true, true, NULL::show_role;
    RETURN;
  END IF;

  -- Otherwise, check show membership
  RETURN QUERY
  SELECT
    sm.can_manage_members,
    sm.can_manage_show,
    sm.can_create_episodes,
    false AS is_site_admin,
    sm.role
  FROM show_members sm
  WHERE sm.user_id = p_user_id AND sm.show_id = p_show_id;

  -- If no membership found, return empty result
END;
$$ LANGUAGE plpgsql;
