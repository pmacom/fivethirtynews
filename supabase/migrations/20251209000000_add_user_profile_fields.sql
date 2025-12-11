-- Migration: Add user profile fields for Character Select feature
-- Date: 2024-12-09

-- Add profile fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS background_image_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_links JSONB DEFAULT '[]'::jsonb;

-- Add constraint for bio length (200 chars max)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_bio_length'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_bio_length CHECK (char_length(bio) <= 200);
  END IF;
END $$;

-- Add constraint for links array (max 4 items)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_profile_links_max'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_profile_links_max
      CHECK (jsonb_array_length(COALESCE(profile_links, '[]'::jsonb)) <= 4);
  END IF;
END $$;

-- Index for finding characters (mods + show hosts)
CREATE INDEX IF NOT EXISTS idx_users_is_moderator ON users(is_moderator) WHERE is_moderator = true;
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = true;

-- Comment on columns for documentation
COMMENT ON COLUMN users.bio IS 'User biography/description (max 200 characters)';
COMMENT ON COLUMN users.background_image_url IS 'URL to user profile background image in Supabase Storage';
COMMENT ON COLUMN users.profile_links IS 'Array of {label, url} objects for user social/external links (max 4)';
