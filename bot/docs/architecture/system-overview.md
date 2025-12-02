# System Overview

**Version**: 1.0
**Last Updated**: 2025-10-10
**Status**: Architecture Definition

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Journey                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Moderator browses X.com (twitter.com)                          │
│  Extension injects "530" button on each post                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Chrome Extension (Content Script)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Twitter    │  │    Reddit    │  │   TikTok     │         │
│  │   Adapter    │  │   Adapter    │  │   Adapter    │         │
│  │   (MVP)      │  │  (Future)    │  │  (Future)    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│         │                 │                 │                   │
│         └─────────────────┴─────────────────┘                   │
│                          │                                       │
│                   ┌──────▼──────┐                               │
│                   │   Button    │                               │
│                   │  Injector   │                               │
│                   └──────┬──────┘                               │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           │ (Chrome Message API)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Background Service Worker                                      │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │  API Client      │  │  Auth Manager    │                   │
│  │  (Supabase SDK)  │  │  (JWT Storage)   │                   │
│  └────────┬─────────┘  └────────┬─────────┘                   │
└───────────┼──────────────────────┼──────────────────────────────┘
            │                      │
            │ HTTPS/REST           │ WebSocket (Realtime)
            ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Supabase Backend (Self-Hosted on DigitalOcean)                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database                                     │  │
│  │  - users, tags, posts, post_tags                         │  │
│  │  - Row Level Security (RLS) Policies                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Auth Service                                            │  │
│  │  - Email/Password authentication                         │  │
│  │  - JWT token generation/validation                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  RESTful API (Auto-generated)                            │  │
│  │  - GET /tags, POST /post-tags, etc.                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Realtime Service                                        │  │
│  │  - WebSocket subscriptions for tag updates              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Next.js Admin UI (Port 3000)                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Dashboard   │  │  Tag Mgmt    │  │  Post Browse │         │
│  │  (Stats)     │  │  (Hierarchy) │  │  (Discovery) │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  Public Access (No login required for viewing)                 │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
                  Public Users Discover Content
```

---

## Component Descriptions

### 1. Chrome Extension

**Purpose**: Inject "530" button into social media posts, allowing moderators to tag content.

**Key Files**:
- `/extension/src/content-scripts/platforms/twitter-adapter.ts` - X.com-specific DOM manipulation
- `/extension/src/background/service-worker.ts` - API coordination, auth management
- `/extension/src/popup/popup.ts` - Quick tag view and settings
- `/extension/manifest.json` - Extension configuration (Manifest V3)

**Technologies**:
- TypeScript
- Vite (bundler)
- Chrome Extensions API (Manifest V3)
- Supabase JS SDK

**Responsibilities**:
1. **Content Script**:
   - Detect social media platform (X.com for MVP)
   - Inject "530" button next to each post
   - Monitor DOM for new posts (MutationObserver)
   - Extract post metadata (URL, ID, content preview)

2. **Background Worker**:
   - Manage authentication state (JWT tokens)
   - Communicate with Supabase API
   - Cache tag hierarchy in IndexedDB
   - Handle real-time updates via WebSocket

3. **Popup UI**:
   - Show recent tags
   - Quick login/logout
   - Extension settings

**Data Flow**:
```
User clicks "530" button
  → Content script sends message to background worker
  → Background worker opens tag selector modal
  → User selects/creates tags
  → Background worker POST to Supabase API
  → Content script updates button state (e.g., "Tagged ✓")
```

---

### 2. Supabase Backend

**Purpose**: Centralized database, authentication, and API layer.

**Deployment**: Self-hosted on DigitalOcean Droplet via Docker Compose.

**Services**:
1. **PostgreSQL Database** (Port 5432)
   - Stores users, tags, posts, post_tags
   - Hierarchical tag structure with flexible reparenting
   - Row Level Security (RLS) for access control

2. **Auth Service** (Port 9999)
   - Email/password authentication (no OAuth)
   - JWT token generation with configurable expiry
   - User role management (moderator, admin)

3. **REST API** (Port 8000)
   - Auto-generated from database schema
   - Endpoints: `/tags`, `/posts`, `/post-tags`
   - Authenticated via JWT in `Authorization` header

4. **Realtime Service** (WebSocket)
   - Subscribe to table changes (e.g., new tags created)
   - Push updates to all connected clients
   - Used for live tag hierarchy updates

**Key Configuration**:
- `supabase/config.toml` - Supabase settings (ports, auth config)
- `supabase/migrations/` - Database schema versions
- `.env` - Environment variables (database password, JWT secret)

**Why Self-Hosted?**:
- No third-party API dependencies
- Full control over data
- Cost-effective for low user count (<100 users)
- Easy migration to Supabase Cloud if needed

---

### 3. Next.js Admin UI

**Purpose**: Public-facing website for browsing tagged content and tag hierarchy management.

**URL**: `https://530societynews.com` (or localhost:3000 in dev)

**Key Pages**:

1. **Dashboard** (`/`)
   - Recent tagged posts
   - Most popular tags
   - Community activity metrics
   - **Access**: Public (no login required)

2. **Tag Browser** (`/tags`)
   - Interactive tree view of tag hierarchy
   - Drag-and-drop reparenting (moderators only)
   - Search tags
   - **Access**: Public read, moderator write

3. **Post Discovery** (`/posts`)
   - Grid/list view of all tagged posts
   - Filter by tag, platform, date
   - Link to original post on X.com
   - **Access**: Public

4. **Tag Management** (`/admin/tags`)
   - Merge duplicate tags
   - Edit tag names
   - Delete tags (with confirmation)
   - **Access**: Moderators only (requires login)

**Technologies**:
- Next.js 14 (App Router)
- React Server Components
- Tailwind CSS
- shadcn/ui components
- Supabase JS SDK

**Authentication Flow**:
- Public pages: No auth required
- Admin pages: Check JWT in cookie → Redirect to `/login` if missing
- Login page: Supabase Auth → Set HTTP-only cookie → Redirect to `/admin`

---

## Data Flow: End-to-End Tag Creation

```
Step 1: Moderator visits X.com
  → Extension content script loads
  → twitter-adapter.ts detects posts
  → Injects "530" button on each post

Step 2: User clicks "530" button
  → Content script: onClick handler triggered
  → Sends message to background worker via chrome.runtime.sendMessage()
  → Message: { action: 'TAG_POST', postData: { url, id, preview } }

Step 3: Background worker receives message
  → Checks auth state (JWT token in chrome.storage)
  → If not authenticated: Open login modal
  → If authenticated: Open tag selector modal

Step 4: Tag selector modal
  → Fetch tag hierarchy from Supabase: GET /tags
  → Display tree view (cached in IndexedDB)
  → User selects existing tag OR creates new tag

Step 5: Save tag association
  → Background worker: POST /post-tags
  → Body: { post_id, tag_id, user_id }
  → Supabase validates JWT → Applies RLS policy → Saves to database

Step 6: Real-time update
  → Supabase Realtime broadcasts change to all connected clients
  → Other moderators' extensions receive update
  → Admin UI live-updates tag list

Step 7: Content script updates UI
  → Button changes from "530" to "530 ✓"
  → Shows tooltip: "Tagged under: Technology > AI"
```

---

## Authentication & Authorization

### User Roles

| Role | Permissions |
|------|-------------|
| **Anonymous** | Read all tags and posts (no account needed) |
| **Moderator** | Create tags, tag posts, view admin UI |
| **Admin** | All moderator permissions + delete/merge tags, manage users |

### Authentication Flow

```
1. User opens extension → Clicks "530" button (first time)
2. Extension checks chrome.storage for JWT token → None found
3. Background worker opens login modal (popup window)
4. User enters email/password
5. Extension calls Supabase Auth: POST /auth/v1/token
6. Supabase returns: { access_token, refresh_token, user }
7. Extension stores tokens in chrome.storage.local (encrypted)
8. Future requests include: Authorization: Bearer {access_token}
9. Token expires after 1 hour → Auto-refresh via refresh_token
```

### Security Measures

1. **RLS Policies**: Database-level access control (cannot bypass in code)
2. **JWT Validation**: All API requests verify token signature
3. **HTTPS Only**: Production deployment requires SSL (Let's Encrypt)
4. **No Password Storage**: Supabase handles bcrypt hashing
5. **Content Script Isolation**: Extension cannot access page JavaScript (prevents XSS)

---

## Technology Stack Summary

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Extension | TypeScript + Vite | Type safety, modern bundling |
| Backend | Supabase (PostgreSQL) | All-in-one backend (DB + Auth + API) |
| Admin UI | Next.js 14 | Server components, excellent DX |
| Styling | Tailwind + shadcn/ui | Rapid prototyping, consistent design |
| Hosting | DigitalOcean Droplet | Cost-effective, full control |
| CI/CD | Manual (MVP) | Git pull on droplet, restart services |

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│  DigitalOcean Droplet (Ubuntu 22.04, 2GB RAM)          │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Docker Compose                                 │    │
│  │  ┌──────────────────┐  ┌──────────────────┐   │    │
│  │  │  Supabase        │  │  Next.js         │   │    │
│  │  │  (Port 8000)     │  │  (Port 3000)     │   │    │
│  │  └──────────────────┘  └──────────────────┘   │    │
│  │  ┌──────────────────┐                          │    │
│  │  │  PostgreSQL      │                          │    │
│  │  │  (Port 5432)     │                          │    │
│  │  └──────────────────┘                          │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Nginx Reverse Proxy                           │    │
│  │  - SSL Termination (Let's Encrypt)             │    │
│  │  - Route /api → Supabase                       │    │
│  │  - Route / → Next.js                           │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                        │
                        │ HTTPS (Port 443)
                        ▼
              530societynews.com
```

**Domains**:
- `530societynews.com` → Admin UI (Next.js)
- `api.530societynews.com` → Supabase API

**SSL**: Let's Encrypt via Certbot (auto-renewal)

---

## Development vs. Production

| Aspect | Development | Production |
|--------|------------|------------|
| Supabase | Local Docker (`supabase start`) | DigitalOcean Docker Compose |
| Database | Ephemeral (reset with `supabase db reset`) | Persistent (volume-mounted) |
| API URL | `http://localhost:54321` | `https://api.530societynews.com` |
| Extension | Sideloaded (developer mode) | Chrome Web Store (if public) |
| Admin UI | `npm run dev` (port 3000) | `npm run build` + PM2 |
| SSL | None (HTTP) | Let's Encrypt (HTTPS) |

---

## Extensibility: Adding New Platforms

**Current**: X.com (Twitter) only

**Future**: Reddit, TikTok, Instagram, etc.

**Platform Adapter Interface**:
```typescript
// /extension/src/content-scripts/platforms/base-adapter.ts
export interface PlatformAdapter {
  // Detect if current page is this platform
  detect(): boolean;

  // Find all post elements on page
  findPosts(): HTMLElement[];

  // Extract post metadata
  extractPostData(post: HTMLElement): {
    platform: string;
    platformPostId: string;
    url: string;
    contentPreview: string;
  };

  // Inject "530" button into post
  injectButton(post: HTMLElement, onClick: () => void): void;

  // Monitor for new posts (infinite scroll)
  observeNewPosts(callback: (post: HTMLElement) => void): void;
}
```

**Adding Reddit Support**:
1. Create `/extension/src/content-scripts/platforms/reddit-adapter.ts`
2. Implement `PlatformAdapter` interface
3. Register in `/extension/src/content-scripts/injector.ts`:
   ```typescript
   const adapters = [
     new TwitterAdapter(),
     new RedditAdapter(),  // New!
   ];
   ```
4. Update database enum: `ALTER TYPE platform ADD VALUE 'reddit';`

---

## Performance Considerations

### Extension
- **Caching**: Tag hierarchy stored in IndexedDB (sync every 5 minutes)
- **Lazy Loading**: Only inject buttons for visible posts (viewport detection)
- **Debouncing**: Throttle MutationObserver to avoid performance hits on fast scrolling

### Database
- **Indexes**: On `tags.parent_id`, `posts.platform_post_id`, `post_tags.tag_id`
- **Materialized Views**: `tag_paths` for fast hierarchy queries (refresh on tag update)
- **Connection Pooling**: Supabase uses pgBouncer (default 15 connections)

### Admin UI
- **Server Components**: Fetch data on server, reduce client JS
- **ISR**: Incremental Static Regeneration for `/tags` page (revalidate every 60s)
- **Pagination**: Limit posts to 50 per page

---

## Monitoring & Logging

**MVP Approach** (Simple):
- Docker logs: `docker logs supabase` → Check for errors
- Supabase Studio: Built-in logs viewer
- Browser console: Extension errors logged to DevTools

**Future** (Production):
- Sentry for error tracking
- Plausible Analytics (privacy-friendly, no cookies)
- Supabase query logs for slow queries

---

## Next Steps

1. **Implement Extension**: Start with `/extension/src/content-scripts/platforms/twitter-adapter.ts`
2. **Test Locally**: Follow `/docs/development/quickstart.md`
3. **Deploy Backend**: Use `/docs/deployment/digitalocean-setup.md`
4. **Build Admin UI**: Next.js dashboard with tag browser
5. **Iterate**: Gather feedback from moderators, refine UI/UX

---

**Questions?** Refer to:
- `/docs/architecture/database-schema.md` - Detailed schema
- `/docs/architecture/tag-hierarchy.md` - Tag reparenting logic
- `/docs/branding.md` - Change "530societynews" name
