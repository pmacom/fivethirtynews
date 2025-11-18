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

## Adding Content

### Via Studio (Recommended)
1. Run: `npm run db:studio`
2. Navigate to "Table Editor"
3. Add/edit rows directly

### Via SQL
1. Edit `supabase/seed.sql`
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
