# Quickstart Guide

**Goal**: Get from zero to tagging X.com posts in 10 minutes.

---

## Prerequisites

- Node.js 18+ and npm/pnpm installed
- Docker Desktop installed
- Chrome browser
- Basic terminal/command-line knowledge

---

## Step 1: Install Supabase CLI (2 minutes)

```bash
# macOS/Linux
brew install supabase/tap/supabase

# Windows (via Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or via npm (all platforms)
npm install -g supabase
```

Verify installation:
```bash
supabase --version
```

---

## Step 2: Initialize Local Supabase (3 minutes)

```bash
# Navigate to project root
cd TwitterBotY25

# Initialize Supabase
supabase init

# Start local Supabase instance (Docker)
supabase start
```

**Expected output:**
```
Started supabase local development setup.

         API URL: http://localhost:54321
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Save these values!** Copy the `API URL` and `anon key` for the next step.

---

## Step 3: Set Up Database Schema (2 minutes)

```bash
# Create migration file
supabase migration new init_schema

# Edit the migration file at supabase/migrations/XXXXXX_init_schema.sql
```

Paste the schema from `/docs/architecture/database-schema.md` (or use this minimal version):

```sql
-- Users table (managed by Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE,
  role TEXT DEFAULT 'moderator',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Hierarchical tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES tags(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  path TEXT[]
);

-- Posts from social media
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'reddit', 'tiktok')),
  platform_post_id TEXT NOT NULL,
  url TEXT NOT NULL,
  content_preview TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(platform, platform_post_id)
);

-- Many-to-many post-tag associations
CREATE TABLE post_tags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (post_id, tag_id, user_id)
);

-- RLS Policies: Public read, authenticated write
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read tags" ON tags FOR SELECT USING (true);
CREATE POLICY "Auth create tags" ON tags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Public read posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Auth create posts" ON posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Public read post_tags" ON post_tags FOR SELECT USING (true);
CREATE POLICY "Auth create post_tags" ON post_tags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```

Apply the migration:
```bash
supabase db reset
```

Visit **Supabase Studio** at http://localhost:54323 to verify tables exist.

---

## Step 4: Create Shared Config (1 minute)

Create `/shared/config.ts`:

```typescript
export const BRAND_CONFIG = {
  name: '530societynews',
  shortName: '530',
  buttonText: '530',
  tagline: 'Community-curated news discovery',
  colors: {
    primary: '#3B82F6',
    secondary: '#10B981',
  }
} as const;

export const SUPABASE_CONFIG = {
  url: 'http://localhost:54321',  // From Step 2
  anonKey: 'YOUR_ANON_KEY_HERE',   // From Step 2
} as const;
```

**Replace `YOUR_ANON_KEY_HERE`** with the actual anon key from Step 2.

---

## Step 5: Run Chrome Extension (1 minute)

```bash
# Navigate to extension directory
cd extension

# Install dependencies
pnpm install

# Build extension
pnpm build

# Or run in development mode with hot reload
pnpm dev
```

**Load in Chrome:**
1. Open Chrome → `chrome://extensions`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select `extension/dist` directory

You should see "530societynews" in your extensions list.

---

## Step 6: Test the Extension (1 minute)

1. Navigate to https://x.com (Twitter)
2. Log in to your X.com account
3. Scroll through your feed
4. Look for the **"530" button** injected next to each post

**If you don't see the button:**
- Check the browser console for errors (F12 → Console)
- Verify the extension is enabled in `chrome://extensions`
- Refresh the X.com page

---

## Step 7: Create Your First Tag

1. Click the **"530" button** on any X.com post
2. A modal will appear asking you to log in (first time only)
3. Enter email/password to create an account (Supabase Auth)
4. After login, the tag selector modal appears
5. Type a tag name (e.g., "Technology > AI")
6. Click "Save"

**Verify in Supabase Studio:**
- Go to http://localhost:54323
- Navigate to **Table Editor** → `posts`
- You should see your tagged post!

---

## Step 8: Run Admin UI (Optional, 1 minute)

```bash
# Navigate to admin UI directory
cd admin-ui

# Install dependencies
pnpm install

# Run development server
pnpm dev
```

Open http://localhost:3000 to see:
- Dashboard with recent tags
- Tag hierarchy browser
- All tagged posts

---

## Troubleshooting

### Extension not injecting button
- **Check manifest.json permissions**: Ensure `activeTab` and `host_permissions` include `*://x.com/*`
- **Inspect content script**: Open DevTools → Sources → Content Scripts
- **Check console errors**: Look for CORS or CSP violations

### Supabase connection errors
- **Verify Supabase is running**: `docker ps` should show `supabase_*` containers
- **Check API URL**: Ensure `SUPABASE_CONFIG.url` matches output from `supabase start`
- **CORS issues**: Supabase local instance has CORS enabled by default

### Database migration errors
- **Reset database**: `supabase db reset` (warning: deletes all data)
- **Check SQL syntax**: Test queries in Supabase Studio SQL Editor

### Authentication not working
- **Check Supabase Studio**: Auth → Users to see if account was created
- **Email confirmation**: Local Supabase has email confirmation disabled by default
- **JWT errors**: Ensure `anon key` is correctly copied

---

## Next Steps

- **Read** `/docs/architecture/system-overview.md` to understand how components interact
- **Customize** branding in `/shared/config.ts` (see `/docs/branding.md`)
- **Deploy** to DigitalOcean when ready (see `/docs/deployment/digitalocean-setup.md`)
- **Extend** tag hierarchy logic (see `/docs/architecture/tag-hierarchy.md`)

---

## Useful Commands

```bash
# Supabase
supabase start              # Start local instance
supabase stop               # Stop instance
supabase db reset           # Reset database (applies migrations)
supabase db diff            # Show schema changes
supabase migration new NAME # Create new migration

# Extension
pnpm dev                    # Development mode with hot reload
pnpm build                  # Production build
pnpm test                   # Run tests

# Admin UI
pnpm dev                    # Development server
pnpm build                  # Production build
pnpm lint                   # Lint code
```

---

**You're now ready to start tagging!** 🎉
