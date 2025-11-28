-- Migration: Add Discord OAuth users and content notes tables
-- Date: 2024-11-28

-- Users table for Discord OAuth authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Discord identity
  discord_id TEXT UNIQUE NOT NULL,
  discord_username TEXT NOT NULL,
  discord_avatar TEXT,
  display_name TEXT NOT NULL,

  -- Guild membership status
  is_guild_member BOOLEAN DEFAULT false,

  -- Role-based permissions
  is_moderator BOOLEAN DEFAULT false,  -- Has moderator/admin role in Discord
  discord_roles TEXT[],                -- Array of Discord role IDs

  -- Session management
  session_token TEXT,
  session_expires_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);
CREATE INDEX IF NOT EXISTS idx_users_session_token ON users(session_token);

-- Content notes table - one note per user per content
CREATE TABLE IF NOT EXISTS content_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationships
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Note content (280 char limit like Twitter)
  note_text TEXT NOT NULL CHECK (char_length(note_text) <= 280),
  author_name TEXT NOT NULL,  -- Snapshot of display name at creation

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: One note per user per content
  UNIQUE(content_id, user_id)
);

-- Indexes for content_notes table
CREATE INDEX IF NOT EXISTS idx_content_notes_content_id ON content_notes(content_id);
CREATE INDEX IF NOT EXISTS idx_content_notes_user_id ON content_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_content_notes_created_at ON content_notes(created_at DESC);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
-- Note: API handles auth via JWT, RLS is permissive for server-side access
CREATE POLICY "Public read users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Public insert users" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update users" ON users
  FOR UPDATE USING (true);

-- RLS Policies for content_notes table
CREATE POLICY "Public read notes" ON content_notes
  FOR SELECT USING (true);

CREATE POLICY "Public insert notes" ON content_notes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update notes" ON content_notes
  FOR UPDATE USING (true);

CREATE POLICY "Public delete notes" ON content_notes
  FOR DELETE USING (true);

-- Updated at trigger for users
CREATE TRIGGER users_updated_at_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Updated at trigger for content_notes
CREATE TRIGGER content_notes_updated_at_trigger
  BEFORE UPDATE ON content_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts authenticated via Discord OAuth - must be members of 530Society';
COMMENT ON COLUMN users.discord_id IS 'Unique Discord user ID';
COMMENT ON COLUMN users.is_guild_member IS 'Whether user is currently a member of 530Society Discord';
COMMENT ON COLUMN users.session_token IS 'JWT session token for API authentication';

COMMENT ON TABLE content_notes IS 'User notes attached to content items - one note per user per content';
COMMENT ON COLUMN content_notes.note_text IS 'Note text content (max 280 characters)';
COMMENT ON COLUMN content_notes.author_name IS 'Snapshot of user display name when note was created';
