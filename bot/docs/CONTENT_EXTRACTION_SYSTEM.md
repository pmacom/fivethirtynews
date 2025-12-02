# Content Extraction System Documentation

## Overview

The 530 Content Extraction System is a processor-based architecture for extracting and storing content from multiple social media platforms. It was inspired by a Discord-based content curation system but adapted for Chrome extensions with direct DOM scraping and API integration.

**Key Difference from Discord Approach**: Instead of relying on Discord's automatic embed generation for rich metadata, this system implements multiple extraction strategies including DOM scraping, Open Graph tags, oEmbed APIs, and platform-specific APIs.

## Architecture

### High-Level Flow

```
User encounters content → Extension detects platform →
Processor extracts data → API validates & stores →
Database with unified schema
```

### Component Diagram

```
┌─────────────────────────────────────────────┐
│         Chrome Extension Layer              │
│  ┌─────────────┐  ┌─────────────┐          │
│  │ Content     │  │  Background │          │
│  │ Scripts     │→ │  Script     │          │
│  └─────────────┘  └─────────────┘          │
└────────────────┬────────────────────────────┘
                 │
                 ↓ HTTP/HTTPS
┌────────────────────────────────────────────┐
│         Next.js API Layer                   │
│  ┌──────────────────────────────────┐      │
│  │  ContentProcessorFactory         │      │
│  │  ↓                                │      │
│  │  ┌────────────────────────────┐  │      │
│  │  │  Platform Processors       │  │      │
│  │  │  - TwitterProcessor        │  │      │
│  │  │  - YouTubeProcessor        │  │      │
│  │  │  - RedditProcessor         │  │      │
│  │  │  - GenericProcessor        │  │      │
│  │  └────────────────────────────┘  │      │
│  └──────────────────────────────────┘      │
│               │                             │
│               ↓                             │
│  ┌──────────────────────────────────┐      │
│  │  MetadataExtractor Service       │      │
│  │  - Open Graph fetching           │      │
│  │  - oEmbed API calls              │      │
│  │  - HTML meta parsing             │      │
│  └──────────────────────────────────┘      │
└────────────────┬────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────────┐
│         Database Layer (Supabase)          │
│  ┌──────────────────────────────────┐      │
│  │  content table (unified schema)   │     │
│  │  - platform                       │     │
│  │  - platform_content_id            │     │
│  │  - metadata (JSONB)               │     │
│  │  - media_assets (JSONB)           │     │
│  │  - tags (JSONB)                   │     │
│  └──────────────────────────────────┘      │
└────────────────────────────────────────────┘
```

## Core Components

### 1. BaseContentProcessor (Abstract Class)

**Location**: `/web/lib/content-processors/types.ts`

All platform processors extend this base class, which provides:

#### Core Methods

```typescript
// Check if processor can handle URL
abstract canProcess(url: string): boolean;

// Get platform identifier
abstract getPlatform(): Platform;

// Extract platform-specific ID
abstract extractPlatformId(url: string): string | null;

// Generate deterministic content ID for deduplication
generateContentId(platform: Platform, platformContentId: string): string;

// Validate URL/content
async validate(input: string): Promise<ValidationResult>;

// Extract all content data
abstract process(input: string | HTMLElement): Promise<ProcessedContent>;

// Extract platform-specific metadata
abstract extractMetadata(input: string | HTMLElement): Promise<Record<string, any>>;
```

#### Key Design Decisions

- **Deterministic IDs**: Content IDs follow pattern `platform:platformContentId` (e.g., `twitter:1234567890`)
- **Flexible Input**: Processors accept either URL strings or DOM elements
- **Type Safety**: Full TypeScript support with strict interfaces

### 2. ContentProcessorFactory

**Location**: `/web/lib/content-processors/ContentProcessorFactory.ts`

Routes URLs to appropriate processors using priority-based pattern matching.

#### URL Detection Logic

```typescript
// Priority system (higher = checked first)
const patterns: PlatformPattern[] = [
  { platform: 'media', patterns: [/\.(jpg|png|mp4)/i], priority: 100 },
  { platform: 'twitter', patterns: [/twitter\.com|x\.com/i], priority: 90 },
  { platform: 'youtube', patterns: [/youtube\.com|youtu\.be/i], priority: 90 },
  { platform: 'generic', patterns: [/https?:\/\/.+/i], priority: 0 }
];
```

#### Usage Example

```typescript
import { ContentProcessorFactory } from '@/lib/content-processors';

// Detect platform
const platform = ContentProcessorFactory.detectPlatform(url);

// Create processor
const processor = ContentProcessorFactory.createProcessor(url);

// Process content
if (processor) {
  const content = await processor.process(url);
}
```

## Platform Processors

### TwitterProcessor

**Location**: `/web/lib/content-processors/TwitterProcessor.ts`

Extracts content from Twitter/X posts using DOM selectors.

#### URL Patterns

```typescript
/https?:\/\/(www\.)?(twitter\.com|x\.com)\/\w+\/status\/\d+/i
/https?:\/\/t\.co\/\w+/i // Shortened URLs
```

#### ID Extraction

```typescript
extractPlatformId(url: string): string | null {
  const match = url.match(/status\/(\d+)/i);
  return match ? match[1] : null;
}
```

#### Data Extraction Points (DOM)

From Chrome extension's DOM access:

```typescript
// Core content
article.querySelector('[data-testid="tweetText"]') // Tweet text
article.querySelector('a[href*="/status/"]') // Tweet URL

// Author
article.querySelector('[data-testid="User-Name"]') // Display name

// Media
article.querySelector('[data-testid="tweetPhoto"] img') // Images
article.querySelectorAll('video') // Videos

// Timestamps
article.querySelector('time')?.dateTime // Creation time
```

#### Metadata Extracted

```typescript
{
  replyCount: number,
  retweetCount: number,
  likeCount: number,
  viewCount: number,
  isRetweet: boolean,
  hasPoll: boolean,
  language: string
}
```

#### Example Output

```typescript
{
  id: "twitter:1234567890",
  platform: "twitter",
  platformContentId: "1234567890",
  url: "https://x.com/user/status/1234567890",
  content: "This is a tweet with #hashtags",
  author: {
    name: "John Doe",
    username: "johndoe",
    url: "https://x.com/johndoe"
  },
  thumbnailUrl: "https://pbs.twimg.com/media/abc.jpg",
  mediaAssets: [
    { type: "image", url: "https://...", width: 1200, height: 675 }
  ],
  metadata: {
    likeCount: 42,
    retweetCount: 10
  },
  extractedAt: "2025-10-12T..."
}
```

### Adding New Processors (YouTube, Reddit, etc.)

**Template Structure**:

```typescript
import { BaseContentProcessor, ProcessedContent, Platform } from './types';

export class YouTubeProcessor extends BaseContentProcessor {
  getPlatform(): Platform {
    return 'youtube';
  }

  canProcess(url: string): boolean {
    return /youtube\.com\/watch\?v=|youtu\.be\//i.test(url);
  }

  extractPlatformId(url: string): string | null {
    const match = url.match(/(?:v=|youtu\.be\/)([^&?]+)/);
    return match ? match[1] : null;
  }

  async process(input: string | HTMLElement): Promise<ProcessedContent> {
    // Implementation
  }

  async extractMetadata(input: string | HTMLElement): Promise<Record<string, any>> {
    // Platform-specific metadata
  }
}
```

## Metadata Extraction Service

**Location**: `/web/lib/services/MetadataExtractor.ts`

### Extraction Strategies

#### 1. Open Graph Tags

Used by most social platforms to provide rich previews:

```html
<meta property="og:title" content="Page Title">
<meta property="og:description" content="Description">
<meta property="og:image" content="https://...">
<meta property="og:type" content="article">
```

**Advantages**:
- Widely supported
- Standardized format
- Includes rich media data

**Limitations**:
- Requires HTML fetch
- May not always be present

#### 2. Twitter Card Tags

```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Title">
<meta name="twitter:description" content="...">
<meta name="twitter:image" content="https://...">
```

#### 3. oEmbed API

Supported platforms: YouTube, Twitter, Vimeo, Reddit, etc.

```typescript
// Fetch oEmbed data
const data = await MetadataExtractor.fetchOEmbed(url, 'youtube');

// Returns:
{
  type: "video",
  title: "Video Title",
  author_name: "Channel Name",
  thumbnail_url: "https://...",
  html: "<iframe...></iframe>"
}
```

#### 4. Standard HTML Meta Tags

Fallback for basic information:

```html
<title>Page Title</title>
<meta name="description" content="...">
<meta name="author" content="...">
```

### Usage Example

```typescript
import { MetadataExtractor } from '@/lib/services/MetadataExtractor';

// Extract all metadata
const metadata = await MetadataExtractor.extractAll(url);

// Get best available data (prioritizes Open Graph → Twitter Card → HTML)
const best = MetadataExtractor.getBestMetadata(metadata);

console.log(best.title, best.description, best.image);
```

### Why This Replaces Discord Embeds

Discord automatically provides rich metadata through its embed system:

```typescript
// What Discord gave us for free:
{
  title: "Tweet Title",
  description: "Tweet content",
  url: "https://...",
  author: { name: "...", url: "..." },
  thumbnail: { url: "..." },
  image: { url: "..." },
  video: { url: "..." },
  fields: [...]
}
```

Our system replicates this by:
1. **DOM scraping** in content scripts (fastest, most reliable)
2. **Open Graph** fetching when DOM not available
3. **oEmbed APIs** for standardized embed data
4. **HTML meta** parsing as fallback

## Database Schema

### Unified Content Table

**Location**: `/supabase/migrations/20251012000000_create_unified_content_table.sql`

```sql
CREATE TABLE content (
  -- Core identification
  id TEXT PRIMARY KEY, -- "platform:platformContentId"
  platform TEXT NOT NULL,
  platform_content_id TEXT NOT NULL,
  url TEXT NOT NULL,

  -- Content fields
  title TEXT,
  description TEXT,
  content TEXT,

  -- Author
  author_name TEXT,
  author_username TEXT,
  author_url TEXT,
  author_avatar_url TEXT,

  -- Media
  thumbnail_url TEXT,
  media_assets JSONB, -- [{type, url, width, height}]

  -- Metadata (platform-specific)
  metadata JSONB,

  -- Tagging
  tags JSONB,

  -- Timestamps
  content_created_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,

  UNIQUE(platform, platform_content_id)
);
```

### Key Design Decisions

#### 1. Deterministic IDs

```typescript
// Format: "platform:platformContentId"
id = "twitter:1234567890"
id = "youtube:abc123xyz"
```

**Benefits**:
- Reliable deduplication
- No UUID collisions
- Easy to trace content origin

#### 2. JSONB for Flexibility

```typescript
// media_assets JSONB
[
  { type: "image", url: "...", width: 1200, height: 675 },
  { type: "video", url: "...", duration: 120 }
]

// metadata JSONB (platform-specific)
{
  likeCount: 42,
  viewCount: 1000,
  isRetweet: false
}
```

**Benefits**:
- Schema flexibility per platform
- Query with GIN indexes
- Easy to extend without migrations

#### 3. Separate Tags Array

```sql
tags JSONB -- ["ai", "web-development", "tutorial"]
```

Indexed with GIN for fast tag queries:
```sql
SELECT * FROM content WHERE tags @> '["ai"]';
```

## Extension Integration

### Content Script Architecture

**Current**: Single Twitter-specific content script
**Future**: Multi-platform content scripts

```
extension/public/
├── content-twitter.js   ← Twitter/X.com
├── content-youtube.js   ← YouTube
├── content-reddit.js    ← Reddit
└── content-generic.js   ← Fallback for any site
```

### How Content Scripts Use Processors

```javascript
// content-twitter.js
import { TwitterProcessor } from '../lib/content-processors';

// Detect tweet elements
const articles = document.querySelectorAll('article[data-testid="tweet"]');

articles.forEach(async (article) => {
  // Create processor
  const processor = new TwitterProcessor();

  // Extract data
  const content = await processor.process(article);

  // Inject 530 button with extracted data
  injectButton(article, content);
});
```

### Button Injection Flow

```
1. Content script loads on page
2. MutationObserver watches for new content
3. Processor extracts data from DOM
4. Button injected next to like/retweet buttons
5. On click: Modal opens with tag selection
6. On save: Send to background script → API → Database
7. Button updates to show tagged state
```

## Migration Path

### From `tagged_posts` to `content`

**Step 1**: Create new unified table (run migration)
```bash
supabase migration apply 20251012000000_create_unified_content_table
```

**Step 2**: Migrate existing Twitter data
```bash
supabase migration apply 20251012000001_migrate_twitter_data
```

**Step 3**: Update API to dual-write (backwards compatible)
```typescript
// Write to both tables during transition
await supabase.from('content').insert(data);
await supabase.from('tagged_posts').insert(legacyData); // Temporary
```

**Step 4**: Gradually migrate all clients to new API

**Step 5**: Deprecate `tagged_posts` table

## Adding a New Platform (Step-by-Step)

### Example: Adding Instagram Support

#### 1. Create Processor Class

```typescript
// /web/lib/content-processors/InstagramProcessor.ts
import { BaseContentProcessor, ProcessedContent, Platform } from './types';

export class InstagramProcessor extends BaseContentProcessor {
  getPlatform(): Platform {
    return 'instagram';
  }

  canProcess(url: string): boolean {
    return /instagram\.com\/(p|reel)\/[\w-]+/i.test(url);
  }

  extractPlatformId(url: string): string | null {
    const match = url.match(/\/(p|reel)\/([\w-]+)/);
    return match ? match[2] : null;
  }

  async process(input: string | HTMLElement): Promise<ProcessedContent> {
    // Implementation
  }

  async extractMetadata(input: string | HTMLElement): Promise<Record<string, any>> {
    // Instagram-specific: likes, comments, location, etc.
  }
}
```

#### 2. Register in Factory

```typescript
// ContentProcessorFactory.ts
import { InstagramProcessor } from './InstagramProcessor';

private static patterns: PlatformPattern[] = [
  // ... existing patterns
  {
    platform: 'instagram',
    patterns: [/instagram\.com\/(p|reel)\/[\w-]+/i],
    processor: InstagramProcessor,
    priority: 90
  }
];
```

#### 3. Create Content Script

```javascript
// extension/public/content-instagram.js
import { InstagramProcessor } from '../lib/content-processors';

const processor = new InstagramProcessor();

// Find Instagram posts
const posts = document.querySelectorAll('article');

posts.forEach(async (post) => {
  const content = await processor.process(post);
  injectButton(post, content);
});
```

#### 4. Update Manifest

```json
{
  "content_scripts": [
    {
      "matches": ["https://www.instagram.com/*"],
      "js": ["content-instagram.js"]
    }
  ]
}
```

#### 5. Test Checklist

- [ ] URL detection works
- [ ] ID extraction correct
- [ ] Content extracted properly
- [ ] Media assets captured
- [ ] Metadata fields populated
- [ ] Button injects correctly
- [ ] Saves to database
- [ ] Deduplication works

## API Endpoints

### POST /api/content

Create or update content with tags.

**Request**:
```json
{
  "platform": "twitter",
  "platformContentId": "1234567890",
  "url": "https://...",
  "content": "Tweet text",
  "author": {
    "name": "John Doe",
    "username": "johndoe"
  },
  "thumbnailUrl": "https://...",
  "tags": ["ai", "web-development"]
}
```

**Response**:
```json
{
  "success": true,
  "data": { /* full content object */ },
  "action": "created" | "updated"
}
```

### GET /api/content/check?platform=twitter&id=1234567890

Check if content exists.

**Response**:
```json
{
  "exists": true,
  "content": { /* full object */ }
}
```

### POST /api/content/enrich

Fetch metadata for URL.

**Request**:
```json
{
  "url": "https://..."
}
```

**Response**:
```json
{
  "openGraph": { /* og tags */ },
  "twitterCard": { /* twitter tags */ },
  "oEmbed": { /* oembed data */ }
}
```

## Key Differences from Discord System

| Aspect | Discord System | 530 System |
|--------|----------------|------------|
| **Metadata Source** | Discord embeds | DOM + Open Graph + oEmbed |
| **Entry Point** | Discord messages | Chrome extension |
| **Detection** | Discord bot monitoring | MutationObserver in DOM |
| **Rich Data** | Automatic from Discord | Manual extraction required |
| **Storage** | MongoDB | PostgreSQL (Supabase) |
| **Architecture** | Processor pattern | Same processor pattern ✓ |

## Best Practices

### 1. Always Validate Input

```typescript
const validation = await processor.validate(url);
if (!validation.isValid) {
  throw new Error(validation.error);
}
```

### 2. Handle Missing Data Gracefully

```typescript
const content = await processor.process(element);
const title = content.title || content.description || 'Untitled';
```

### 3. Respect Rate Limits

```typescript
// Cache Open Graph data
const cache = new Map();
if (cache.has(url)) return cache.get(url);
```

### 4. Test with Real Content

Always test processors with actual platform URLs to ensure selectors and patterns work correctly.

## Troubleshooting

### Issue: Processor not detecting URL

**Solution**: Check regex patterns in ContentProcessorFactory

```typescript
// Test pattern
const pattern = /youtube\.com\/watch\?v=/i;
console.log(pattern.test(url));
```

### Issue: Missing metadata

**Solution**: Verify extraction strategy priority:
1. Try DOM scraping first (fastest)
2. Fallback to Open Graph
3. Try oEmbed if available
4. Use generic HTML meta

### Issue: Duplicate content

**Solution**: Ensure deterministic IDs are used:
```typescript
const id = processor.generateContentId(platform, platformId);
// Should always produce: "platform:id"
```

## Future Enhancements

- [ ] Video detection utility (cross-platform)
- [ ] Automatic platform detection without URL
- [ ] Bulk metadata fetching
- [ ] Caching layer for Open Graph data
- [ ] Platform API integrations (Twitter API, YouTube Data API)
- [ ] Content archiving (save HTML/screenshots)
- [ ] Rich preview generation

## References

- **Base Processor**: `/web/lib/content-processors/types.ts`
- **Factory**: `/web/lib/content-processors/ContentProcessorFactory.ts`
- **Twitter Processor**: `/web/lib/content-processors/TwitterProcessor.ts`
- **Metadata Service**: `/web/lib/services/MetadataExtractor.ts`
- **Database Schema**: `/supabase/migrations/20251012000000_create_unified_content_table.sql`
- **Extension Code**: `/extension/public/content.js`

---

**Last Updated**: October 12, 2025
**Version**: 1.0.0
