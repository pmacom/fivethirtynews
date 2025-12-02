-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE platform_enum AS ENUM ('twitter', 'reddit', 'tiktok', 'instagram', 'youtube');

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'moderator' CHECK (role IN ('moderator', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Tags table with hierarchical structure
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES tags(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  path TEXT[],
  UNIQUE(name, parent_id)
);

-- Create indexes for tags
CREATE INDEX idx_tags_parent_id ON tags(parent_id);
CREATE INDEX idx_tags_created_by ON tags(created_by);
CREATE INDEX idx_tags_path ON tags USING GIN(path);
CREATE INDEX idx_tags_name ON tags(name);

-- Trigger to automatically update tag path
CREATE OR REPLACE FUNCTION update_tag_path()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.path := ARRAY[NEW.name];
  ELSE
    SELECT path || NEW.name INTO NEW.path
    FROM tags WHERE id = NEW.parent_id;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tag_path
BEFORE INSERT OR UPDATE OF parent_id, name ON tags
FOR EACH ROW EXECUTE FUNCTION update_tag_path();

-- Prevent circular references in tag hierarchy
CREATE OR REPLACE FUNCTION prevent_circular_parent()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM tags
    WHERE id = NEW.parent_id
    AND path @> ARRAY[NEW.name]
  ) THEN
    RAISE EXCEPTION 'Circular reference detected: tag cannot be its own ancestor';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_circular
BEFORE UPDATE OF parent_id ON tags
FOR EACH ROW EXECUTE FUNCTION prevent_circular_parent();

-- Posts table
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform platform_enum NOT NULL,
  platform_post_id TEXT NOT NULL,
  url TEXT NOT NULL,
  content_preview TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(platform, platform_post_id)
);

-- Create indexes for posts
CREATE INDEX idx_posts_platform ON posts(platform);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_url ON posts(url);

-- Post-tag associations (many-to-many with user attribution)
CREATE TABLE post_tags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (post_id, tag_id, user_id)
);

-- Create indexes for post_tags
CREATE INDEX idx_post_tags_post_id ON post_tags(post_id);
CREATE INDEX idx_post_tags_tag_id ON post_tags(tag_id);
CREATE INDEX idx_post_tags_user_id ON post_tags(user_id);
CREATE INDEX idx_post_tags_created_at ON post_tags(created_at DESC);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public read access
CREATE POLICY "Public read users" ON users FOR SELECT USING (true);
CREATE POLICY "Public read tags" ON tags FOR SELECT USING (true);
CREATE POLICY "Public read posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Public read post_tags" ON post_tags FOR SELECT USING (true);

-- RLS Policies: Authenticated write access for tags
CREATE POLICY "Auth create tags" ON tags FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Creator or admin update tags" ON tags FOR UPDATE
USING (
  created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin delete tags" ON tags FOR DELETE
USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies: Authenticated write access for posts
CREATE POLICY "Auth create posts" ON posts FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies: Authenticated write access for post_tags
CREATE POLICY "Auth create post_tags" ON post_tags FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "User delete own post_tags" ON post_tags FOR DELETE
USING (user_id = auth.uid());
