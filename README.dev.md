# FiveThirty Development Guide

Quick reference for developing with FiveThirty.

## Getting Started

### Start Development Environment
```bash
npm run dev
```

This will automatically:
1. ✅ Check if Supabase is running
2. ✅ Start Supabase if needed
3. ✅ Display Supabase connection info
4. ✅ Start Next.js with Turbopack

Your app will be available at: **http://localhost:3000**

## Available Scripts

### Development
- `npm run dev` - Start dev environment (Supabase + Next.js)
- `npm run dev:next-only` - Start only Next.js (if Supabase already running)

### Database
- `npm run db:start` - Start Supabase only
- `npm run db:stop` - Stop Supabase
- `npm run db:reset` - Reset database and reload seed data
- `npm run db:seed:prod` - Load production dataset (8,000+ items)
- `npm run db:studio` - Open Supabase Studio GUI

### Build & Deploy
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Supabase Access

When Supabase is running, you can access:

- **API:** http://127.0.0.1:54321
- **Studio (Database GUI):** http://127.0.0.1:54323
- **Database:** postgresql://postgres:postgres@127.0.0.1:54322/postgres

## Database Structure

### Tables
1. **episodes** - Show episodes
2. **content_blocks** - Categories (AI, Code, Design, etc.)
3. **content_block_items** - Links blocks to content
4. **content** - Actual content items (tweets, videos, etc.)
5. **tweets** - Cached tweet data

### Relationships
```
episodes
  └── content_blocks (1:many)
        └── content_block_items (1:many)
              └── content (many:1)
```

## Database Seeding

### Default Test Data
By default, `npm run db:reset` loads a small test dataset:
- **1 episode**: "Episode 001: AI & Tech Roundup"
- **3 content blocks**: AI, Code & Development, Design & Art
- **6 sample items**: Mix of tweets, videos, and images

This is perfect for quick onboarding and testing.

### Production Dataset (Optional)
To work with the full production content library:

```bash
npm run db:seed:prod
```

This loads:
- **8,000+ content items** from the production database
- Historical tweets, videos, links, and articles
- Real 530 News content collection

**Note:**
- Production seed contains 4.3MB of data (may take 30-60 seconds)
- Only includes `content` table data
- You may need to manually create episodes/blocks via Studio for complete functionality

### When to Use Which?

**Use test data when:**
- First time setup / onboarding
- Quick feature development
- Testing UI components
- Fast database resets

**Use production data when:**
- Testing with real content variety
- Performance testing with large datasets
- Debugging content-specific issues
- Demoing with actual 530 News content

## Adding Content

### Via Studio (Recommended)
1. Run: `npm run db:studio`
2. Navigate to "Table Editor"
3. Add/edit rows directly

### Via SQL
1. Edit `supabase/seed.sql` (for test data)
2. Run: `npm run db:reset`

## Troubleshooting

### Port Already in Use
```bash
# Stop any running processes
npm run db:stop
# Kill any stuck Next.js processes
pkill -f "next dev"
# Try again
npm run dev
```

### Database Connection Failed
```bash
# Reset Supabase
npm run db:stop
npm run db:reset
npm run dev
```

### Clear Everything
```bash
# Stop all services
npm run db:stop
# Remove Docker volumes (nuclear option)
supabase db reset --linked false
# Restart
npm run dev
```

## Content Types Supported

- `video` - YouTube, Vimeo, etc.
- `twitter` - Twitter/X posts
- `warpcast` - Farcaster casts
- `website` - Web articles
- `discord` - Discord messages
- `image` - Images and artwork

## Environment Variables

All environment variables are in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` - API endpoint
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public API key

## Tips

- Supabase keeps running even after stopping Next.js
- Use `npm run db:stop` to fully shut down
- Studio is great for quick data exploration
- Seed data reloads automatically on `db:reset`

## What Changed?

### Zustand Migration
✅ Migrated all stores from zustand-x to regular zustand v5.0.8
- All stores now use standard zustand hooks
- Persist middleware configured for tweet caching

### Database Setup
✅ Local Supabase instance configured
- PostgreSQL database with full schema
- Sample data for testing viewer
- Automatic startup with dev command

Happy coding! 🚀
