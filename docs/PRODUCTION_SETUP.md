# 530 Society Production Setup Guide

This document captures the complete production setup process for 530society.com.

## Server Details

- **IP**: 159.65.216.226
- **Domain**: 530society.com
- **Subdomains**: bot.530society.com (Discord bot API)
- **OS**: Ubuntu/Debian on DigitalOcean

## Services Running (PM2)

| Name | Port | Description |
|------|------|-------------|
| 530news | 3000 | Next.js main application |
| discord-bot | 3001 | Discord bot HTTP server |

## Prerequisites

- Node.js v21+
- pnpm
- PM2 (`npm install -g pm2`)
- nginx
- certbot (for SSL)
- Supabase CLI (local machine only)

---

## 1. Initial Server Setup

```bash
# SSH into server
ssh root@159.65.216.226

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_21.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PM2
npm install -g pm2

# Clone repository
cd /root
git clone git@github.com:pmacom/fivethirtynews.git fivethirty
cd fivethirty
pnpm install
```

---

## 2. Environment Configuration

### Main App (.env.production)

Create `/root/fivethirty/.env.production`:

```env
# App URLs
NEXT_PUBLIC_APP_URL=https://530society.com
NEXT_PUBLIC_SITE_URL=https://530society.com
NODE_ENV=production

# Supabase (PRODUCTION - not localhost!)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_URL=https://your-project.supabase.co

# Discord OAuth
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_REDIRECT_URI=https://530society.com/api/auth/discord/callback

# Bot Communication
BOT_URL=https://bot.530society.com
BOT_API_SECRET=your_shared_secret
```

**IMPORTANT**: Do NOT have a `.env.local` file on production - it overrides `.env.production`!

### Discord Bot (.env)

Create `/root/fivethirty/bot/discord/.env`:

```env
DISCORD_BOT_TOKEN=your_bot_token
BOT_API_SECRET=your_shared_secret
BOT_HTTP_PORT=3001
APP_URL=https://530society.com
```

---

## 3. Nginx Configuration

Edit `/etc/nginx/sites-available/530society.com`:

```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name 530society.com www.530society.com bot.530society.com;
    return 301 https://$host$request_uri;
}

# Main site - 530society.com and www
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name 530society.com www.530society.com;

    ssl_certificate /etc/letsencrypt/live/530society.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/530society.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Discord bot subdomain
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name bot.530society.com;

    ssl_certificate /etc/letsencrypt/live/530society.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/530society.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and test:
```bash
ln -s /etc/nginx/sites-available/530society.com /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## 4. SSL Certificates

```bash
# Install certbot
apt install certbot python3-certbot-nginx

# Get certificates (include all domains)
certbot --nginx -d 530society.com -d www.530society.com -d bot.530society.com
```

---

## 5. DNS Records

Add these A records in your DNS provider:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 159.65.216.226 | 300 |
| A | www | 159.65.216.226 | 300 |
| A | bot | 159.65.216.226 | 300 |

---

## 6. Database Setup (Supabase)

### Link to production Supabase (from local machine):
```bash
cd /path/to/fivethirty
supabase link --project-ref your_project_ref
```

### Push migrations:
```bash
supabase db push
```

### If uuid_generate_v4() error occurs:
Run in Supabase SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.uuid_generate_v4()
RETURNS uuid AS $$
  SELECT extensions.uuid_generate_v4();
$$ LANGUAGE sql;
```

Then run `supabase db push` again.

---

## 7. PM2 Configuration

### ecosystem.config.js

Create `/root/fivethirty/ecosystem.config.js`:

```javascript
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.production') });

module.exports = {
  apps: [{
    name: '530news',
    script: 'npm',
    args: 'run start -- -p 3000',
    cwd: '/root/fivethirty',
    env: {
      ...process.env,
      NODE_ENV: 'production',
    },
    instances: 1,
    exec_mode: 'cluster',
    autorestart: true,
    max_memory_restart: '1G',
  }]
}
```

### Start services:

```bash
# Build Next.js app
cd /root/fivethirty
pnpm run build

# Start main app
pm2 start ecosystem.config.js
pm2 save

# Start Discord bot (uses compiled JS, not tsx)
cd /root/fivethirty/bot/discord
pm2 start dist/index.js --name discord-bot
pm2 save

# Enable startup on boot
pm2 startup
```

---

## 8. Deployment Updates

When deploying new code:

```bash
cd /root/fivethirty
git pull
pnpm run build
pm2 restart 530news --update-env
```

For Discord bot changes:
```bash
cd /root/fivethirty/bot/discord
# Bot dist is committed to repo, just pull
pm2 restart discord-bot
```

---

## 9. Useful Commands

### Check service status:
```bash
pm2 list
pm2 logs 530news
pm2 logs discord-bot
```

### Check env vars loaded by PM2:
```bash
pm2 env <id>  # Use numeric ID, not name
```

### Test bot subdomain:
```bash
curl https://bot.530society.com/health
```

### Check nginx config:
```bash
nginx -t
systemctl status nginx
```

### View Discord auth debug log:
```bash
cat /tmp/discord-auth-debug.log | tail -30
```

### Restart with fresh env:
```bash
pm2 delete 530news
pm2 start ecosystem.config.js
pm2 save
```

---

## 10. Troubleshooting

### "Failed to save user data" on Discord login
- Check `/tmp/discord-auth-debug.log` for the actual error
- Verify Supabase URL is NOT `127.0.0.1:54321` (that's local)
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set
- Check if `users` table exists in Supabase

### PM2 not loading env vars
- PM2's `env_file` doesn't work reliably
- Use ecosystem.config.js with dotenv
- Delete and recreate the PM2 process after env changes

### Bot crash loop (exit code 137)
- Exit code 137 = OOM killer
- Add swap space or increase server RAM
- Bot uses chunked member fetching to reduce memory

### SSL certificate errors
- Re-run certbot with all domains included
- `certbot --nginx -d 530society.com -d www.530society.com -d bot.530society.com`

### Next.js using wrong env vars
- Delete `.env.local` if it exists on production
- `NEXT_PUBLIC_*` vars are baked in at build time - must rebuild
- Run `pnpm run build` after any env changes

---

## Architecture Overview

```
                    ┌─────────────────┐
                    │   Cloudflare    │
                    │   (DNS only)    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │     nginx       │
                    │  (SSL + proxy)  │
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
  ┌────────▼────────┐ ┌──────▼──────┐         │
  │  530society.com │ │ bot.530...  │         │
  │   Next.js:3000  │ │  Bot:3001   │         │
  └────────┬────────┘ └──────┬──────┘         │
           │                 │                 │
           └────────┬────────┘                 │
                    │                          │
           ┌────────▼────────┐                 │
           │    Supabase     │                 │
           │   (Database)    │◄────────────────┘
           └─────────────────┘
```

---

*Last updated: December 2025*
*Created during initial production deployment session*
