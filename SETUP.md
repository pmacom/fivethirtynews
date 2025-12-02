# 530 News - Setup & Deployment Guide

This guide covers local development setup, production deployment, and database management for the 530 News platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (Local Development)](#quick-start-local-development)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Chrome Extension](#chrome-extension)
6. [Discord Bot](#discord-bot)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20+ | Runtime environment |
| pnpm | 9.15+ | Package manager |
| Docker | Latest | Supabase local development |
| Supabase CLI | Latest | Database management |

### Installation

```bash
# Install pnpm (if not already installed)
npm install -g pnpm

# Install Supabase CLI
brew install supabase/tap/supabase

# Verify installations
node --version    # Should be 20+
pnpm --version    # Should be 9.15+
supabase --version
docker --version
```

---

## Quick Start (Local Development)

### 1. Clone and Install

```bash
git clone <repository-url>
cd fivethirty
pnpm install
```

### 2. Start Supabase

```bash
# Start local Supabase (Docker must be running)
npm run db:start

# This will output your local credentials:
# - API URL: http://127.0.0.1:54321
# - Studio URL: http://127.0.0.1:54323
# - Anon Key: sb_publishable_...
# - Service Role Key: sb_secret_...
```

### 3. Configure Environment

```bash
# Create .env.local from the Supabase output
cat > .env.local << 'EOF'
# Local Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Discord OAuth (get from Discord Developer Portal)
DISCORD_CLIENT_ID=<your-client-id>
DISCORD_CLIENT_SECRET=<your-client-secret>
DISCORD_BOT_TOKEN=<your-bot-token>

# Discord Role IDs (from your Discord server)
DISCORD_ADMIN_ROLE_IDS=<comma-separated-role-ids>
DISCORD_MODERATOR_ROLE_IDS=<comma-separated-role-ids>

# Bot Communication
BOT_URL=http://localhost:3001
BOT_API_SECRET=<generate-secure-random-string>
EOF
```

### 4. Seed Database (Optional)

```bash
# Reset and seed with test data
npm run db:reset

# Or seed with production data (if available)
npm run db:seed:prod
```

### 5. Start Development Server

```bash
# Start Next.js app (runs on port 3000)
npm run dev
```

### 6. Build & Load Chrome Extension (Dev)

```bash
# Build dev extension (purple theme, localhost URLs)
npm run ext:build:dev

# Load in Chrome:
# 1. Go to chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the `extension-dev/` folder
```

---

## Environment Configuration

### Next.js App (`.env.local`)

| Variable | Description | Local Value | Production Value |
|----------|-------------|-------------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API endpoint | `http://127.0.0.1:54321` | `https://<project>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase key | From `supabase start` | From Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only) | From `supabase start` | From Supabase dashboard |
| `DISCORD_CLIENT_ID` | Discord OAuth App ID | From Discord Dev Portal | Same |
| `DISCORD_CLIENT_SECRET` | Discord OAuth Secret | From Discord Dev Portal | Same |
| `DISCORD_BOT_TOKEN` | Bot token for API calls | From Discord Dev Portal | Same |
| `DISCORD_ADMIN_ROLE_IDS` | Role IDs with admin access | Server-specific | Server-specific |
| `DISCORD_MODERATOR_ROLE_IDS` | Role IDs with mod access | Server-specific | Server-specific |
| `BOT_URL` | Discord bot HTTP server | `http://localhost:3001` | `https://bot.530society.com` |
| `BOT_API_SECRET` | Shared secret for bot auth | Any secure string | Different secure string |

### Discord Bot (`bot/discord/.env`)

```bash
# Copy from example
cp bot/discord/.env.example bot/discord/.env
```

| Variable | Description |
|----------|-------------|
| `DISCORD_BOT_TOKEN` | Bot token from Discord Developer Portal |
| `DISCORD_GUILD_ID` | Your Discord server ID |
| `BOT_HTTP_PORT` | HTTP server port (default: 3001) |
| `BOT_API_SECRET` | Must match `BOT_API_SECRET` in Next.js |
| `SUPABASE_URL` | Supabase URL (same as Next.js) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (same as Next.js) |
| `APP_URL` | Next.js app URL for embeds |

### Chrome Extension (Build-time)

The extension uses build-time environment injection. No `.env` file needed.

| Build Command | Environment | API URL | App URL | Color |
|---------------|-------------|---------|---------|-------|
| `npm run ext:build:dev` | Development | `http://localhost:3000/api` | `http://localhost:3000` | Purple (#8B5CF6) |
| `npm run ext:build` | Production | `https://530society.com/api` | `https://530society.com` | Green (#10B981) |

---

## Database Setup

### Local Development

```bash
# Start Supabase services
npm run db:start

# View Supabase Studio (GUI)
npm run db:studio
# Opens http://127.0.0.1:54323

# Reset database (runs all migrations + seed.sql)
npm run db:reset

# Stop Supabase
npm run db:stop
```

### Database Schema

The schema is defined in migrations at `supabase/migrations/`. Key tables:

| Table | Purpose |
|-------|---------|
| `content` | All tagged content (tweets, videos, etc.) |
| `episodes` | Show episodes/broadcasts |
| `content_blocks` | Categories within episodes |
| `content_block_items` | Links content to blocks |
| `channels` | Content channels/collections |
| `tweets` | Cached Twitter/X data |
| `content_labels` | Moderation labels |
| `shows` | Show definitions |

### Seeding Production Database

For a fresh production deployment:

```bash
# 1. First, ensure all migrations are applied
supabase db push --db-url "postgresql://postgres:<password>@<host>:5432/postgres"

# 2. Seed with production content (if you have historical data)
psql "postgresql://postgres:<password>@<host>:5432/postgres" -f supabase/seed.production.sql

# Or use the npm script (requires local psql configuration)
npm run db:seed:prod:load
```

### Creating a Production Seed File

To export your current data for seeding a new environment:

```bash
# Export content table
pg_dump --data-only --table=content \
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  > supabase/seed.production.sql

# Export multiple tables
pg_dump --data-only \
  --table=content \
  --table=channels \
  --table=tweets \
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  > supabase/seed.production.sql
```

### Migration Workflow

```bash
# Create a new migration
supabase migration new <migration_name>

# Apply migrations locally
supabase db reset

# Push migrations to production
supabase db push --db-url "postgresql://..."
```

---

## Chrome Extension

### Development Build

```bash
# Build dev extension (purple, localhost)
npm run ext:build:dev

# Watch mode for development
npm run ext:watch:dev
```

**Dev Extension Features:**
- Name: "530 News (DEV)"
- Purple icon and header
- Points to `localhost:3000`
- Console logs show purple badge

### Production Build

```bash
# Build production extension (green, 530society.com)
npm run ext:build

# Watch mode for production
npm run ext:watch
```

**Production Extension Features:**
- Name: "530 News"
- Green icon and header
- Points to `https://530society.com`
- Console logs show green badge

### Loading Extensions in Chrome

1. Open `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select folder:
   - Dev: `extension-dev/`
   - Prod: `extension/`

### Extension Architecture

```
extension/
├── manifest.json          # Generated from template
├── background.js          # Service worker (env-aware)
├── popup.html             # Popup UI (env-aware)
├── popup.js               # Popup logic
├── dist/                  # Vite-built content scripts
│   ├── content.js         # Twitter/X content script
│   ├── content-youtube.js # YouTube content script
│   └── content-reddit.js  # Reddit content script
├── icons/                 # Extension icons
└── scripts/
    └── generate-manifest.js  # Build-time manifest generator
```

---

## Discord Bot

### Setup

```bash
# Navigate to bot directory
cd bot/discord

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your values

# Start bot
pnpm run dev
```

### Discord Developer Portal Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create new application or select existing
3. Go to "Bot" section
4. Reset and copy the bot token
5. Enable required intents:
   - Message Content Intent
   - Server Members Intent
6. Go to "OAuth2" → "URL Generator"
7. Select scopes: `bot`, `applications.commands`
8. Select permissions: `Send Messages`, `Embed Links`, `Read Messages/View Channels`
9. Copy generated URL and use to invite bot to server

### Bot Environment Variables

```bash
DISCORD_BOT_TOKEN=<bot-token>
DISCORD_GUILD_ID=<server-id>
BOT_HTTP_PORT=3001
BOT_API_SECRET=<shared-secret-with-nextjs>
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
APP_URL=http://localhost:3000
```

---

## Production Deployment

### Overview

| Component | Recommended Platform | Notes |
|-----------|---------------------|-------|
| Next.js App | Vercel / Railway | Auto-deploys from Git |
| Supabase | Supabase Cloud | Managed PostgreSQL |
| Discord Bot | Railway / Render | Long-running process |
| Chrome Extension | Chrome Web Store | Manual upload |

### 1. Supabase Cloud Setup

1. Create project at [supabase.com](https://supabase.com)
2. Go to Settings → API to get:
   - Project URL
   - Anon Key
   - Service Role Key
3. Push migrations:
   ```bash
   supabase link --project-ref <project-id>
   supabase db push
   ```
4. (Optional) Seed with production data:
   ```bash
   psql "<connection-string>" -f supabase/seed.production.sql
   ```

### 2. Next.js Deployment (Vercel)

1. Connect repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`
   - `DISCORD_BOT_TOKEN`
   - `DISCORD_ADMIN_ROLE_IDS`
   - `DISCORD_MODERATOR_ROLE_IDS`
   - `BOT_URL`
   - `BOT_API_SECRET`
3. Deploy

### 3. Discord Bot Deployment (Railway)

1. Create new project on Railway
2. Connect `bot/discord` directory
3. Set environment variables
4. Deploy

### 4. Chrome Extension Publishing

1. Build production extension:
   ```bash
   npm run ext:build
   ```
2. Zip the `extension/` folder
3. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
4. Upload zip file
5. Fill in store listing details
6. Submit for review

---

## Troubleshooting

### Supabase Won't Start

```bash
# Check Docker is running
docker ps

# Remove old Supabase containers
supabase stop --no-backup
docker system prune -f

# Restart
npm run db:start
```

### Extension Not Connecting

1. Check console for CORS errors
2. Verify extension is using correct environment:
   - Dev: Should show purple badge in console
   - Prod: Should show green badge in console
3. Ensure Next.js server is running on expected port

### Database Migration Errors

```bash
# Check migration status
supabase migration list

# Reset completely (CAUTION: destroys data)
supabase db reset --local

# Check for conflicting migrations
ls supabase/migrations/
```

### Discord Bot Not Responding

1. Check bot is online in Discord server
2. Verify bot has required permissions
3. Check bot logs for errors
4. Ensure `BOT_API_SECRET` matches between Next.js and bot

---

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Build Next.js for production |
| `npm run db:start` | Start local Supabase |
| `npm run db:stop` | Stop local Supabase |
| `npm run db:reset` | Reset database with migrations and seed |
| `npm run db:studio` | Open Supabase Studio GUI |
| `npm run db:seed:prod` | Reset and seed with production data |
| `npm run ext:build:dev` | Build dev Chrome extension |
| `npm run ext:build` | Build production Chrome extension |
| `npm run ext:watch:dev` | Watch mode for dev extension |
| `npm run ext:watch` | Watch mode for prod extension |

---

## Environment Checklist

### Local Development

- [ ] Docker running
- [ ] Supabase started (`npm run db:start`)
- [ ] `.env.local` configured
- [ ] `bot/discord/.env` configured
- [ ] Next.js running (`npm run dev`)
- [ ] Dev extension loaded (`extension-dev/`)

### Production Deployment

- [ ] Supabase Cloud project created
- [ ] Migrations pushed to Supabase Cloud
- [ ] Production data seeded (if applicable)
- [ ] Vercel environment variables set
- [ ] Discord bot deployed and running
- [ ] Production extension built and published

---

## Support

For issues or questions:
- Check existing [GitHub Issues](https://github.com/530society/fivethirty/issues)
- Join our [Discord Server](https://discord.gg/530society)
