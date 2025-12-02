# Database Schema

**Version**: 1.0
**Last Updated**: 2025-10-10
**Database**: PostgreSQL 15+ (via Supabase)

---

## Overview

The 530 Project uses a relational database with four core tables:
1. **users** - Authentication and role management
2. **tags** - Hierarchical tagging system with flexible reparenting
3. **posts** - Social media content from multiple platforms
4. **post_tags** - Many-to-many association with user attribution

**Design Principles**:
- **Public Read, Authenticated Write**: Row Level Security (RLS) enforces this
- **Flexible Hierarchy**: Tags can be reparented without breaking associations
- **Platform Agnostic**: `posts.platform` enum supports future platforms
- **User Attribution**: Track who created each tag and association

---

## Entity Relationship Diagram

```
┌─────────────────┐
│     users       │
│─────────────────│
│ id (PK)         │◄─────┐
│ email           │      │
│ role            │      │
│ created_at      │      │
└─────────────────┘      │
                         │ created_by
                         │
┌─────────────────┐      │
│     tags        │      │
│─────────────────│      │
│ id (PK)         │◄─────┤
│ name            │      │
│ parent_id (FK)  │──┐   │
│ created_by (FK) │──┘   │
│ created_at      │      │
│ updated_at      │      │
│ path            │      │
└─────────────────┘      │
        ▲                │
        │                │
        │                │
┌─────────────────┐      │
│   post_tags     │      │
│─────────────────│      │
│ post_id (FK)    │──┐   │
│ tag_id (FK)     │──┤   │
│ user_id (FK)    │──┼───┘
│ created_at      │  │
└─────────────────┘  │
        │            │
        ▼            │
┌─────────────────┐  │
│     posts       │  │
│─────────────────│  │
│ id (PK)         │◄─┘
│ platform        │
│ platform_post_id│
│ url             │
│ content_preview │
│ created_at      │
└─────────────────┘
```

---

## Table Definitions

### 1. users

**Purpose**: Store user accounts with role-based permissions.

**Schema**:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'moderator' CHECK (role IN ('moderator', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

**Columns**:
- `id`: References Supabase Auth `auth.users(id)` (auto-managed)
- `email`: User's email address (unique)
- `role`: Permission level
  - `moderator`: Can create tags and tag posts
  - `admin`: Can delete/merge tags, manage users
- `created_at`: Account creation timestamp

**Notes**:
- Supabase Auth handles password hashing, JWT tokens, email verification
- This table extends `auth.users` with application-specific fields
- On user deletion, cascade removes all their tags and associations

---

### 2. tags

**Purpose**: Hierarchical tagging system with flexible parent-child relationships.

**Schema**:
```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES tags(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  path TEXT[],  -- Materialized path: ['root', 'tech', 'ai']
  UNIQUE(name, parent_id)  -- Prevent duplicate siblings
);

-- Indexes
CREATE INDEX idx_tags_parent_id ON tags(parent_id);
CREATE INDEX idx_tags_created_by ON tags(created_by);
CREATE INDEX idx_tags_path ON tags USING GIN(path);  -- Fast path queries
CREATE INDEX idx_tags_name ON tags(name);

-- Trigger to update path on insert/update
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
```

**Columns**:
- `id`: Unique tag identifier
- `name`: Tag label (e.g., "Artificial Intelligence")
- `parent_id`: Self-referential foreign key for hierarchy (nullable for root tags)
- `created_by`: User who created this tag
- `created_at`: Creation timestamp
- `updated_at`: Last modification timestamp (auto-updated by trigger)
- `path`: Array of ancestor names for efficient queries (e.g., `['Technology', 'AI', 'Machine Learning']`)

**Key Features**:
- **Flexible Reparenting**: Change `parent_id` without breaking `post_tags` associations
- **Orphan-Safe**: `ON DELETE SET NULL` means deleting a parent creates a root tag (not cascade delete)
- **Materialized Path**: `path` array enables fast queries like "get all tags under Technology"
- **Unique Constraint**: Prevent duplicate tag names within the same parent

**Example Data**:
```sql
-- Root tags
INSERT INTO tags (name, parent_id) VALUES ('Technology', NULL);
INSERT INTO tags (name, parent_id) VALUES ('Politics', NULL);

-- Child tags
INSERT INTO tags (name, parent_id)
VALUES ('Artificial Intelligence', (SELECT id FROM tags WHERE name = 'Technology'));

INSERT INTO tags (name, parent_id)
VALUES ('Machine Learning', (SELECT id FROM tags WHERE name = 'Artificial Intelligence'));

-- Result paths:
-- Technology: ['Technology']
-- Artificial Intelligence: ['Technology', 'Artificial Intelligence']
-- Machine Learning: ['Technology', 'Artificial Intelligence', 'Machine Learning']
```

---

### 3. posts

**Purpose**: Store social media content from any platform (X.com, Reddit, etc.).

**Schema**:
```sql
CREATE TYPE platform_enum AS ENUM ('twitter', 'reddit', 'tiktok', 'instagram', 'youtube');

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform platform_enum NOT NULL,
  platform_post_id TEXT NOT NULL,  -- External post ID (e.g., Twitter status ID)
  url TEXT NOT NULL,
  content_preview TEXT,  -- First 280 chars of post content
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(platform, platform_post_id)  -- Prevent duplicate posts
);

-- Indexes
CREATE INDEX idx_posts_platform ON posts(platform);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_url ON posts(url);
```

**Columns**:
- `id`: Unique post identifier
- `platform`: Social media platform (enum for validation)
- `platform_post_id`: External ID from platform (e.g., Twitter status ID `1234567890`)
- `url`: Direct link to original post
- `content_preview`: Truncated post text for display (max 280 chars)
- `created_at`: When post was first tagged in our system

**Platform Values**:
- `twitter`: X.com (formerly Twitter)
- `reddit`: Reddit posts/comments
- `tiktok`: TikTok videos
- `instagram`: Instagram posts
- `youtube`: YouTube videos

**Example Data**:
```sql
INSERT INTO posts (platform, platform_post_id, url, content_preview) VALUES (
  'twitter',
  '1234567890',
  'https://x.com/user/status/1234567890',
  'Just launched our new AI model that can...'
);
```

**Notes**:
- `UNIQUE(platform, platform_post_id)` prevents the same post from being added twice
- `content_preview` is optional (NULL if extension can't extract text)

---

### 4. post_tags

**Purpose**: Many-to-many association between posts and tags with user attribution.

**Schema**:
```sql
CREATE TABLE post_tags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (post_id, tag_id, user_id)
);

-- Indexes
CREATE INDEX idx_post_tags_post_id ON post_tags(post_id);
CREATE INDEX idx_post_tags_tag_id ON post_tags(tag_id);
CREATE INDEX idx_post_tags_user_id ON post_tags(user_id);
CREATE INDEX idx_post_tags_created_at ON post_tags(created_at DESC);
```

**Columns**:
- `post_id`: Reference to tagged post
- `tag_id`: Reference to tag
- `user_id`: User who created this association (attribution)
- `created_at`: When association was created

**Key Features**:
- **Composite Primary Key**: `(post_id, tag_id, user_id)` allows multiple users to tag the same post with the same tag
- **Cascade Delete**: Deleting a post or tag removes associations automatically
- **User Attribution**: Track who tagged what (useful for moderation)

**Example Data**:
```sql
-- User A tags post with "Technology"
INSERT INTO post_tags (post_id, tag_id, user_id) VALUES (
  'post-uuid-123',
  'tag-uuid-tech',
  'user-uuid-a'
);

-- User B also tags the same post with "Technology"
INSERT INTO post_tags (post_id, tag_id, user_id) VALUES (
  'post-uuid-123',
  'tag-uuid-tech',
  'user-uuid-b'
);
```

**Queries**:
```sql
-- Get all tags for a post
SELECT t.* FROM tags t
JOIN post_tags pt ON t.id = pt.tag_id
WHERE pt.post_id = 'post-uuid-123';

-- Get all posts with a specific tag
SELECT p.* FROM posts p
JOIN post_tags pt ON p.id = pt.post_id
WHERE pt.tag_id = 'tag-uuid-tech';

-- Get tag usage count
SELECT t.name, COUNT(DISTINCT pt.post_id) AS post_count
FROM tags t
LEFT JOIN post_tags pt ON t.id = pt.tag_id
GROUP BY t.id, t.name
ORDER BY post_count DESC;
```

---

## Row Level Security (RLS) Policies

**Philosophy**: Public read access for discovery, authenticated write access for moderation.

### Enable RLS
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;
```

### Public Read Access
```sql
-- Anyone can read all tables (even without login)
CREATE POLICY "Public read users" ON users FOR SELECT USING (true);
CREATE POLICY "Public read tags" ON tags FOR SELECT USING (true);
CREATE POLICY "Public read posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Public read post_tags" ON post_tags FOR SELECT USING (true);
```

### Authenticated Write Access
```sql
-- Only authenticated users can create tags
CREATE POLICY "Auth create tags" ON tags FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Only tag creator or admin can update tags
CREATE POLICY "Creator or admin update tags" ON tags FOR UPDATE
USING (
  created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Only admin can delete tags
CREATE POLICY "Admin delete tags" ON tags FOR DELETE
USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Only authenticated users can create posts
CREATE POLICY "Auth create posts" ON posts FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Only authenticated users can create post-tag associations
CREATE POLICY "Auth create post_tags" ON post_tags FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Users can delete their own associations
CREATE POLICY "User delete own post_tags" ON post_tags FOR DELETE
USING (user_id = auth.uid());
```

**Why RLS?**:
- Enforced at database level (cannot bypass in application code)
- Prevents accidental data leaks
- Simplifies API logic (no manual permission checks)

---

## Migrations

### Initial Schema Migration
**File**: `supabase/migrations/20250110000000_init_schema.sql`

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE platform_enum AS ENUM ('twitter', 'reddit', 'tiktok', 'instagram', 'youtube');

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'moderator' CHECK (role IN ('moderator', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tags table with hierarchy
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

-- Post-tag associations
CREATE TABLE post_tags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (post_id, tag_id, user_id)
);

-- Indexes (see table definitions above)
-- ... (all CREATE INDEX statements)

-- Triggers
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

-- RLS Policies (see RLS section above)
-- ... (all ALTER TABLE and CREATE POLICY statements)
```

### Applying Migrations
```bash
# Create migration
supabase migration new init_schema

# Apply to local database
supabase db reset

# Apply to production (after deployment)
supabase db push
```

---

## Common Queries

### Get Full Tag Hierarchy
```sql
-- Recursive CTE to build tree structure
WITH RECURSIVE tag_tree AS (
  -- Base case: root tags
  SELECT
    id,
    name,
    parent_id,
    path,
    1 AS depth
  FROM tags
  WHERE parent_id IS NULL

  UNION ALL

  -- Recursive case: children
  SELECT
    t.id,
    t.name,
    t.parent_id,
    t.path,
    tt.depth + 1
  FROM tags t
  JOIN tag_tree tt ON t.parent_id = tt.id
)
SELECT * FROM tag_tree ORDER BY path;
```

### Get All Posts Under a Tag (Including Descendants)
```sql
-- Find all posts tagged with "Technology" or any child tag
SELECT DISTINCT p.*
FROM posts p
JOIN post_tags pt ON p.id = pt.post_id
JOIN tags t ON pt.tag_id = t.id
WHERE t.path @> ARRAY['Technology']  -- GIN index makes this fast
ORDER BY p.created_at DESC;
```

### Reparent a Tag
```sql
-- Move "Machine Learning" from under "AI" to directly under "Technology"
UPDATE tags
SET parent_id = (SELECT id FROM tags WHERE name = 'Technology')
WHERE name = 'Machine Learning';

-- The trigger automatically updates the path array
-- Old path: ['Technology', 'AI', 'Machine Learning']
-- New path: ['Technology', 'Machine Learning']
```

### Find Orphaned Tags (No Parent, No Children, No Posts)
```sql
SELECT t.*
FROM tags t
LEFT JOIN tags children ON t.id = children.parent_id
LEFT JOIN post_tags pt ON t.id = pt.tag_id
WHERE t.parent_id IS NULL
  AND children.id IS NULL
  AND pt.tag_id IS NULL;
```

### Get Tag Usage Statistics
```sql
SELECT
  t.name,
  t.path,
  COUNT(DISTINCT pt.post_id) AS post_count,
  COUNT(DISTINCT pt.user_id) AS user_count,
  MAX(pt.created_at) AS last_used
FROM tags t
LEFT JOIN post_tags pt ON t.id = pt.tag_id
GROUP BY t.id, t.name, t.path
ORDER BY post_count DESC
LIMIT 20;
```

---

## Database Backup Strategy

### Local Development
- **No backups needed**: `supabase db reset` rebuilds from migrations

### Production (DigitalOcean)
```bash
# Daily backup cron job (runs at 2 AM)
0 2 * * * docker exec supabase_db pg_dump -U postgres > /backups/db_$(date +\%Y\%m\%d).sql

# Retention: Keep 7 days, then weekly for 4 weeks
find /backups -name "db_*.sql" -mtime +7 -delete
```

**Backup Script** (`/scripts/backup-db.sh`):
```bash
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="db_${DATE}.sql"

docker exec supabase_db pg_dump -U postgres -F c -f /tmp/${FILENAME}
docker cp supabase_db:/tmp/${FILENAME} ${BACKUP_DIR}/${FILENAME}

# Upload to DigitalOcean Spaces (optional)
s3cmd put ${BACKUP_DIR}/${FILENAME} s3://530-backups/

echo "Backup completed: ${FILENAME}"
```

---

## Performance Optimization

### Index Strategy
- **Primary Keys**: Automatic B-tree indexes
- **Foreign Keys**: Explicit indexes on all FKs for fast joins
- **GIN Index**: On `tags.path` for fast array containment queries (`@>` operator)
- **Partial Indexes**: Consider adding for common filters (e.g., posts from last 30 days)

### Query Optimization
- **Materialized Path**: Avoids expensive recursive CTEs for hierarchy queries
- **Connection Pooling**: Supabase uses pgBouncer (limit: 15 concurrent connections)
- **Prepared Statements**: Supabase REST API uses prepared statements automatically

### Scaling Considerations
- **Current Load**: <100 users, <10k posts → Single Supabase instance sufficient
- **Future Load**: 1k+ users → Consider read replicas, caching layer (Redis)

---

## Next Steps

1. **Apply Schema**: Run `supabase db reset` to create tables
2. **Seed Data**: Create initial tags (Technology, Politics, etc.)
3. **Test Queries**: Verify RLS policies work in Supabase Studio
4. **Build API**: Use Supabase auto-generated REST API or custom Edge Functions

**Related Documentation**:
- `/docs/architecture/tag-hierarchy.md` - Deep dive into reparenting logic
- `/docs/development/quickstart.md` - Apply this schema locally
- `/docs/deployment/digitalocean-setup.md` - Production database setup
