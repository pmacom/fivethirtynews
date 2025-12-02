# DigitalOcean Deployment Guide

**Version**: 1.0
**Last Updated**: 2025-10-10
**Target Platform**: DigitalOcean Droplet (Ubuntu 22.04)

---

## Overview

This guide walks through deploying the 530 Project on a single DigitalOcean droplet using Docker Compose. The setup includes:
- Self-hosted Supabase (PostgreSQL + Auth + API + Realtime)
- Next.js Admin UI
- Nginx reverse proxy with SSL (Let's Encrypt)

**Estimated Setup Time**: 30-45 minutes

---

## Prerequisites

- DigitalOcean account with payment method
- Domain name pointing to your droplet (e.g., `530societynews.com`)
- Basic SSH and Linux command-line knowledge
- GitHub repository with your code (optional, for easy deployment)

---

## Step 1: Create DigitalOcean Droplet (5 minutes)

### 1.1 Create Droplet

1. Log in to DigitalOcean → **Create** → **Droplets**
2. **Choose an image**: Ubuntu 22.04 LTS x64
3. **Choose a plan**:
   - **Basic**: Shared CPU
   - **Size**:
     - $12/month (2GB RAM, 1 vCPU, 50GB SSD) - Good for 10-50 users
     - $24/month (4GB RAM, 2 vCPU, 80GB SSD) - Recommended for 100+ users
4. **Choose a datacenter region**: Select closest to your users (e.g., New York, San Francisco)
5. **Authentication**:
   - Recommended: SSH keys (more secure)
   - Alternative: Password (change after first login)
6. **Hostname**: `530-production`
7. Click **Create Droplet**

**Save your droplet's IP address** (e.g., `192.168.1.100`)

### 1.2 Point Domain to Droplet

In your domain registrar (Namecheap, GoDaddy, etc.):

```
# DNS A Records
@                 A    192.168.1.100   (530societynews.com)
www               A    192.168.1.100   (www.530societynews.com)
api               A    192.168.1.100   (api.530societynews.com)
```

**Wait 5-15 minutes for DNS propagation** (check with `nslookup 530societynews.com`)

---

## Step 2: Initial Server Setup (10 minutes)

### 2.1 SSH into Droplet

```bash
ssh root@192.168.1.100
```

### 2.2 Update System

```bash
apt update && apt upgrade -y
```

### 2.3 Create Non-Root User

```bash
# Create user
adduser 530deploy

# Add to sudo group
usermod -aG sudo 530deploy

# Copy SSH keys (if using)
rsync --archive --chown=530deploy:530deploy ~/.ssh /home/530deploy
```

**Switch to new user**:
```bash
su - 530deploy
```

### 2.4 Install Docker & Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group (avoid sudo)
sudo usermod -aG docker $USER

# Log out and back in for group to take effect
exit
ssh 530deploy@192.168.1.100

# Verify Docker
docker --version

# Install Docker Compose (if not included)
sudo apt install docker-compose-plugin -y
docker compose version
```

### 2.5 Install Git

```bash
sudo apt install git -y
git --version
```

---

## Step 3: Clone Project & Setup Environment (5 minutes)

### 3.1 Clone Repository

```bash
cd /home/530deploy
git clone https://github.com/yourusername/TwitterBotY25.git
cd TwitterBotY25
```

**Or manually upload files**:
```bash
# On your local machine
rsync -avz --exclude 'node_modules' \
  /path/to/TwitterBotY25/ \
  530deploy@192.168.1.100:/home/530deploy/TwitterBotY25/
```

### 3.2 Create Environment File

```bash
nano .env.production
```

**Contents**:
```bash
# Database
POSTGRES_PASSWORD=YOUR_SECURE_PASSWORD_HERE
POSTGRES_DB=530_production

# Supabase
SUPABASE_URL=https://api.530societynews.com
SUPABASE_ANON_KEY=WILL_BE_GENERATED_AFTER_FIRST_START
SUPABASE_SERVICE_ROLE_KEY=WILL_BE_GENERATED_AFTER_FIRST_START
JWT_SECRET=YOUR_JWT_SECRET_HERE_AT_LEAST_32_CHARS

# Next.js
NEXT_PUBLIC_SUPABASE_URL=https://api.530societynews.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=WILL_BE_GENERATED_AFTER_FIRST_START
NODE_ENV=production

# Domain
DOMAIN=530societynews.com
API_DOMAIN=api.530societynews.com
```

**Generate secure passwords**:
```bash
# PostgreSQL password
openssl rand -base64 32

# JWT secret (at least 32 characters)
openssl rand -base64 48
```

**Save and exit** (Ctrl+X, Y, Enter)

---

## Step 4: Configure Docker Compose (5 minutes)

### 4.1 Create Docker Compose File

```bash
nano docker-compose.production.yml
```

**Contents**:
```yaml
version: '3.8'

services:
  # PostgreSQL Database
  db:
    image: postgres:15-alpine
    container_name: 530_db
    restart: unless-stopped
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - db_data:/var/lib/postgresql/data
    networks:
      - 530_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Supabase (self-hosted)
  supabase:
    image: supabase/postgres:15.1.0.117
    container_name: 530_supabase
    restart: unless-stopped
    ports:
      - "8000:8000"   # API
      - "5432:5432"   # PostgreSQL (for direct access if needed)
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      SITE_URL: https://${DOMAIN}
      API_EXTERNAL_URL: https://${API_DOMAIN}
    volumes:
      - supabase_data:/var/lib/postgresql/data
      - ./supabase/migrations:/docker-entrypoint-initdb.d
    networks:
      - 530_network
    depends_on:
      db:
        condition: service_healthy

  # Next.js Admin UI
  admin-ui:
    build:
      context: ./admin-ui
      dockerfile: Dockerfile
    container_name: 530_admin_ui
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      NODE_ENV: production
    networks:
      - 530_network
    depends_on:
      - supabase

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: 530_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - certbot_data:/var/www/certbot
    networks:
      - 530_network
    depends_on:
      - supabase
      - admin-ui

  # Certbot for SSL certificates
  certbot:
    image: certbot/certbot
    container_name: 530_certbot
    volumes:
      - ./nginx/ssl:/etc/letsencrypt
      - certbot_data:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

volumes:
  db_data:
  supabase_data:
  certbot_data:

networks:
  530_network:
    driver: bridge
```

### 4.2 Create Nginx Configuration

```bash
mkdir -p nginx/ssl
nano nginx/nginx.conf
```

**Contents** (initial, before SSL):
```nginx
events {
    worker_connections 1024;
}

http {
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=web_limit:10m rate=30r/s;

    # Main site (Admin UI)
    server {
        listen 80;
        server_name 530societynews.com www.530societynews.com;

        # Certbot challenge location
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        # Redirect to HTTPS (will enable after SSL setup)
        # return 301 https://$server_name$request_uri;

        # Temporary: proxy to Next.js
        location / {
            proxy_pass http://admin-ui:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }

    # API subdomain (Supabase)
    server {
        listen 80;
        server_name api.530societynews.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        # Temporary: proxy to Supabase
        location / {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://supabase:8000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

---

## Step 5: Start Services (5 minutes)

### 5.1 Start Docker Compose

```bash
# Start services
docker compose -f docker-compose.production.yml up -d

# View logs
docker compose -f docker-compose.production.yml logs -f

# Check status
docker ps
```

**Expected output**:
```
CONTAINER ID   IMAGE                    STATUS         PORTS
abc123...      supabase/postgres...     Up 2 minutes   0.0.0.0:8000->8000/tcp
def456...      530_admin_ui             Up 2 minutes   0.0.0.0:3000->3000/tcp
ghi789...      nginx:alpine             Up 2 minutes   0.0.0.0:80->80/tcp
```

### 5.2 Get Supabase Keys

```bash
# Check Supabase logs for anon key and service_role key
docker logs 530_supabase | grep -E 'anon key|service_role'
```

**Copy these keys** and update `.env.production`:
```bash
nano .env.production
# Update SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY
```

**Restart admin-ui**:
```bash
docker compose -f docker-compose.production.yml restart admin-ui
```

### 5.3 Apply Database Migrations

```bash
# Install Supabase CLI (if not already)
curl -fsSL https://supabase.com/install.sh | sh

# Link to remote database
supabase link --project-ref production --password ${POSTGRES_PASSWORD}

# Push migrations
supabase db push
```

**Or manually apply**:
```bash
docker exec -i 530_supabase psql -U postgres < supabase/migrations/20250110000000_init_schema.sql
```

---

## Step 6: Setup SSL with Let's Encrypt (10 minutes)

### 6.1 Obtain SSL Certificates

```bash
# Stop nginx temporarily
docker compose -f docker-compose.production.yml stop nginx

# Run certbot
docker compose -f docker-compose.production.yml run --rm certbot \
  certonly --standalone \
  -d 530societynews.com \
  -d www.530societynews.com \
  -d api.530societynews.com \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email

# Start nginx
docker compose -f docker-compose.production.yml start nginx
```

### 6.2 Update Nginx Config for HTTPS

```bash
nano nginx/nginx.conf
```

**Add HTTPS server blocks**:
```nginx
events {
    worker_connections 1024;
}

http {
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=web_limit:10m rate=30r/s;

    # HTTP -> HTTPS redirect
    server {
        listen 80;
        server_name 530societynews.com www.530societynews.com api.530societynews.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    # Main site HTTPS
    server {
        listen 443 ssl http2;
        server_name 530societynews.com www.530societynews.com;

        ssl_certificate /etc/nginx/ssl/live/530societynews.com/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/live/530societynews.com/privkey.pem;

        location / {
            limit_req zone=web_limit burst=50 nodelay;
            proxy_pass http://admin-ui:3000;
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

    # API HTTPS
    server {
        listen 443 ssl http2;
        server_name api.530societynews.com;

        ssl_certificate /etc/nginx/ssl/live/530societynews.com/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/live/530societynews.com/privkey.pem;

        location / {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://supabase:8000;
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
}
```

**Reload Nginx**:
```bash
docker compose -f docker-compose.production.yml restart nginx
```

### 6.3 Test SSL

Visit:
- https://530societynews.com (Admin UI)
- https://api.530societynews.com/rest/v1/ (Supabase API)

**Check SSL grade**: https://www.ssllabs.com/ssltest/

---

## Step 7: Configure Automatic Backups (5 minutes)

### 7.1 Create Backup Script

```bash
mkdir -p /home/530deploy/backups
nano /home/530deploy/backups/backup-db.sh
```

**Contents**:
```bash
#!/bin/bash
BACKUP_DIR="/home/530deploy/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="db_${DATE}.sql.gz"

# Dump database and compress
docker exec 530_supabase pg_dump -U postgres -F c | gzip > ${BACKUP_DIR}/${FILENAME}

# Keep only last 7 days
find ${BACKUP_DIR} -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: ${FILENAME}"
```

**Make executable**:
```bash
chmod +x /home/530deploy/backups/backup-db.sh
```

### 7.2 Setup Cron Job

```bash
crontab -e
```

**Add line** (runs daily at 2 AM):
```
0 2 * * * /home/530deploy/backups/backup-db.sh >> /home/530deploy/backups/backup.log 2>&1
```

**Test backup**:
```bash
/home/530deploy/backups/backup-db.sh
ls -lh /home/530deploy/backups/
```

---

## Step 8: Firewall Configuration (Optional but Recommended)

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (important!)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

---

## Step 9: Deploy Chrome Extension Config

Update extension config to point to production:

**`/extension/src/config.ts`**:
```typescript
export const SUPABASE_CONFIG = {
  url: 'https://api.530societynews.com',
  anonKey: 'YOUR_PRODUCTION_ANON_KEY',  // From Step 5.2
} as const;
```

**Rebuild extension**:
```bash
cd extension
pnpm build
# Upload dist/ to Chrome Web Store (or distribute via GitHub)
```

---

## Deployment Checklist

- [ ] Droplet created and SSH access confirmed
- [ ] Domain DNS records pointing to droplet IP
- [ ] Docker and Docker Compose installed
- [ ] Environment variables configured in `.env.production`
- [ ] Docker Compose services running (`docker ps` shows all containers)
- [ ] Database migrations applied successfully
- [ ] SSL certificates obtained and nginx configured for HTTPS
- [ ] Admin UI accessible at https://530societynews.com
- [ ] Supabase API accessible at https://api.530societynews.com
- [ ] Extension updated with production API URL
- [ ] Automatic backups configured and tested
- [ ] Firewall rules enabled

---

## Maintenance & Updates

### Update Code

```bash
cd /home/530deploy/TwitterBotY25
git pull origin main
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml up -d --build
```

### View Logs

```bash
# All services
docker compose -f docker-compose.production.yml logs -f

# Specific service
docker logs -f 530_supabase
docker logs -f 530_admin_ui
docker logs -f 530_nginx
```

### Restart Services

```bash
# All services
docker compose -f docker-compose.production.yml restart

# Specific service
docker restart 530_supabase
```

### Database Console

```bash
# Connect to PostgreSQL
docker exec -it 530_supabase psql -U postgres

# Run queries
\dt  -- List tables
SELECT COUNT(*) FROM posts;
\q   -- Quit
```

---

## Troubleshooting

### Services won't start
```bash
# Check logs for errors
docker compose -f docker-compose.production.yml logs

# Common issues:
# - Port already in use: sudo netstat -tulpn | grep :80
# - Permission issues: sudo chown -R $USER:$USER /home/530deploy/TwitterBotY25
```

### SSL certificate errors
```bash
# Check certificate expiry
openssl x509 -in nginx/ssl/live/530societynews.com/cert.pem -noout -dates

# Manually renew
docker compose -f docker-compose.production.yml run --rm certbot renew
docker restart 530_nginx
```

### Database connection errors
```bash
# Check database is running
docker exec 530_supabase pg_isready -U postgres

# Check connection from admin-ui
docker exec 530_admin_ui ping supabase
```

### Out of disk space
```bash
# Check usage
df -h

# Clean Docker images
docker system prune -a

# Clean old logs
sudo truncate -s 0 /var/lib/docker/containers/*/*-json.log
```

---

## Cost Estimate

| Item | Cost |
|------|------|
| DigitalOcean Droplet (2GB RAM) | $12/month |
| Domain registration | $10-15/year |
| SSL certificate (Let's Encrypt) | Free |
| **Total** | **~$12-13/month** |

---

## Next Steps

- **Monitor Performance**: Setup monitoring with Uptime Robot or similar
- **Configure Alerts**: Email notifications for downtime
- **Scale Up**: If traffic grows, upgrade droplet or add load balancer
- **Add CDN**: CloudFlare for static asset caching

**Related Documentation**:
- `/docs/development/quickstart.md` - Local development setup
- `/docs/architecture/system-overview.md` - Architecture details
- `/docs/architecture/database-schema.md` - Database backup/restore
