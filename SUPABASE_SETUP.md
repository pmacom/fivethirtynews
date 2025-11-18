# Local Supabase Setup Guide

This guide will help you set up a local Supabase database for the FiveThirty viewer.

## Prerequisites

- Docker Desktop installed and running
- Node.js and npm/pnpm installed

## Step 1: Install Supabase CLI

```bash
# Using npm
npm install -g supabase

# Or using Homebrew (macOS)
brew install supabase/tap/supabase
```

## Step 2: Initialize Supabase (if not already done)

The Supabase configuration has already been created for you. Verify the files exist:
- `supabase/migrations/20250117_initial_schema.sql` - Database schema
- `supabase/seed.sql` - Sample data
- `supabase/config.toml` - Supabase configuration

## Step 3: Start Supabase Locally

```bash
# From the project root
supabase start
```

This will:
- Download and start all required Docker containers
- Run the database migrations
- Set up the API and Studio

**Important:** The first time you run this, it will take a few minutes to download all Docker images.

When complete, you'll see output like:
```
Started supabase local development setup.

         API URL: http://localhost:54321
     GraphQL URL: http://localhost:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGc...
service_role key: eyJhbGc...
```

## Step 4: Load Seed Data

```bash
# Load the sample data
supabase db reset
```

This will reset the database and load the seed data from `supabase/seed.sql`.

## Step 5: Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# Copy the values from the 'supabase start' output above
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**To get your keys:**
```bash
supabase status
```

Look for the `anon key` value and paste it into `.env.local`.

## Step 6: Restart Next.js Dev Server

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

## Database Schema Overview

Your database has 5 main tables:

### 1. `episodes`
- Represents a show episode
- Contains title, description, and date

### 2. `content`
- Stores all content items (tweets, videos, websites, etc.)
- Includes metadata like thumbnail URLs, categories, descriptions
- Supports content types: video, twitter, warpcast, website, discord, image

### 3. `content_blocks`
- Categories within an episode (e.g., "AI News", "Code Updates")
- Links to episodes via `episode_id`
- Has a weight for ordering

### 4. `content_block_items`
- Junction table linking content_blocks to content
- Contains notes/descriptions for each item
- Has a weight for ordering within a block

### 5. `tweets`
- Caches full tweet data from Twitter API
- Stores tweet ID and full JSON data
- Used by the persist store for offline access

## Useful Commands

```bash
# View database status
supabase status

# Stop all services
supabase stop

# View database logs
supabase db logs

# Access database directly
supabase db psql

# Open Supabase Studio (GUI)
# Visit http://localhost:54323 in your browser

# Create a new migration
supabase migration new your_migration_name

# Apply migrations
supabase db push

# Reset database and reload seed data
supabase db reset
```

## Supabase Studio

Access the visual database editor at http://localhost:54323

You can:
- Browse and edit tables
- Run SQL queries
- View real-time data changes
- Test authentication
- Monitor API logs

## Adding More Content

### Option 1: Using Supabase Studio
1. Go to http://localhost:54323
2. Navigate to "Table Editor"
3. Add new rows to your tables

### Option 2: Using SQL
Edit `supabase/seed.sql` and run:
```bash
supabase db reset
```

### Option 3: Programmatically
Use the Supabase client in your app to insert data.

## Troubleshooting

### Port Already in Use
If you see port conflicts:
```bash
supabase stop
# Wait a few seconds
supabase start
```

### Docker Not Running
Make sure Docker Desktop is running before starting Supabase.

### Database Connection Issues
1. Check that Supabase is running: `supabase status`
2. Verify `.env.local` has correct values
3. Restart your Next.js dev server

### Reset Everything
If things get messed up:
```bash
supabase stop
supabase db reset
supabase start
```

## Next Steps

1. Start Supabase: `supabase start`
2. Copy your `anon key` to `.env.local`
3. Restart your dev server
4. Visit http://localhost:3000

Your viewer should now load with the sample episode containing AI, Code, and Design content!
