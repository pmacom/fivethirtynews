# Database Management Scripts

Quick utilities for managing your local Supabase database during development.

## Available Scripts

### `npm run db:reset`
**Full database reset** - Recreates the entire database from scratch.
- Drops and recreates all tables
- Runs all migrations
- Runs seed.sql (currently minimal)
- **Time**: ~30-60 seconds
- **Use when**: Schema changes, migration issues, or complete fresh start needed

### `npm run db:reset-content`
**Fast content-only reset** - Clears all content while preserving schema and tags.
- Deletes all content, posts, comments
- Preserves 107 tags and 127 tag relationships
- Preserves database schema and migrations
- **Time**: < 1 second
- **Use when**: Testing content imports, cleaning test data, iterating on content

### `npm run db:seed-demo`
**Seed demo content** - Adds sample content for testing.
- 10 Twitter/X posts
- 5 YouTube videos
- 2 Reddit posts
- **Time**: < 1 second
- **Use when**: Need test data to work with

### `npm run db:counts`
**Show table counts** - Quick overview of database contents.
- Shows row counts for all content tables
- Shows tag system counts
- Handles missing WTF schema gracefully
- **Time**: < 1 second
- **Use when**: Verifying data state, checking reset success

## Common Workflows

### Clean slate for content import testing
```bash
npm run db:reset-content   # Clear all content
npm run db:seed-demo       # Add demo data
npm run db:counts          # Verify
```

### Test your import script multiple times
```bash
npm run db:reset-content   # Start fresh
node scripts/import.js     # Run your import
npm run db:counts          # Check results
# Repeat as needed
```

### Full reset when migrations change
```bash
npm run db:reset           # Full reset with migrations
npm run db:seed-demo       # Optional: add demo data
```

## Safety Features

- `db:reset-content` includes safety check - only runs on local database (postgres on localhost:54322)
- Will not accidentally delete production data
- Always shows before/after counts for verification

## Files

- `reset-content.sql` - Fast content reset script
- `show-counts.sql` - Display table row counts
- `seed-demo-content.sql` - Demo content for all platforms
- `README.md` - This file

## Notes

- The minimal `seed.sql` file is intentionally kept empty to keep fresh resets clean
- Use `seed-demo-content.sql` when you explicitly want test data
- All scripts handle missing WTF schema tables gracefully (WTF integration not yet implemented)
