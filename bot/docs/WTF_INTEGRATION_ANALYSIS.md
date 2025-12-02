# WTF Library Integration Analysis

**Date**: October 11, 2025
**Status**: Phase 1 - Analysis & Planning
**Sprint Type**: Multi-stage integration

---

## Executive Summary

The WTF (Web Three Fiber) library is a React Three Fiber-based 3D content visualization system that displays content in an immersive 3D environment with audio reactivity, navigation, and dynamic state management.

**Current State**: We have a Chrome extension tagging X.com posts with a hierarchical tag system (11 root categories, 107 total tags) stored in Supabase.

**Target State**: Integrate WTF to visualize tagged posts in an interactive 3D Next.js application.

**Key Challenge**: Transform our flat `tagged_posts` structure into WTF's hierarchical `LiveViewContentBlock[]` format.

---

## 1. WTF Library Requirements

### Data Structure Expected by WTF

```typescript
interface LiveViewContentBlock {
  id: string                          // Category/topic ID
  title: string                       // Category name
  weight: number                      // Sort order
  episode_id: string                  // Episode identifier
  description: string                 // Category description
  content_block_items: LiveViewContentBlockItems[]
}

interface LiveViewContentBlockItems {
  id: string                          // Item ID
  note: string                        // Note/annotation
  weight: number                      // Sort order within category
  content_block_id: string            // Parent category ID
  news_id: string                     // Content reference ID
  content: LiveViewContent            // Actual content data
}

interface LiveViewContent {
  id: string                          // Content ID
  version: number                     // Content version
  content_type: ContentType           // 'video' | 'twitter' | 'image' | etc.
  content_url: string                 // URL to content
  content_id: string                  // Platform-specific ID (tweet_id)
  content_created_at: string          // Creation timestamp
  thumbnail_url: string               // Thumbnail/preview image
  submitted_by: string                // User who submitted
  submitted_at: string                // Submission timestamp
  category: string                    // Primary category
  categories: string[]                // All categories
  description: string                 // Content description
}
```

### Hierarchical Structure

```
Episode (e.g., "Daily Digest - Oct 11, 2025")
  └── ContentBlocks (Categories - our tag categories)
       └── ContentBlockItems (Items - individual tagged posts)
            └── Content (Media - the actual tweet/post)
```

---

## 2. Current 530 Database Schema

### Tagged Posts Table

```sql
CREATE TABLE tagged_posts (
  id text PRIMARY KEY,
  tweet_id text UNIQUE NOT NULL,
  tweet_text text,
  author text,
  url text NOT NULL,
  timestamp timestamp with time zone,
  user_id text DEFAULT 'anonymous',
  category text DEFAULT 'uncategorized',
  tags jsonb DEFAULT '[]',           -- Array of tag slugs: ["ai-art", "llm"]
  categories jsonb DEFAULT '{}',
  created_at timestamp with time zone
);
```

### Tags Table

```sql
CREATE TABLE tags (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE,
  parent_id uuid REFERENCES tags(id),
  description text,
  icon text,
  color text,
  depth integer DEFAULT 0,
  path text[],                       -- Materialized path
  is_system boolean DEFAULT false,
  created_at timestamp with time zone
);
```

**Current Data**:
- 11 root categories (AI, Web Development, Ethics & Society, etc.)
- 96 child tags (LLM, AI Art, Frontend Frameworks, etc.)
- Tagged posts with `tags` as jsonb array of slugs

---

## 3. Data Transformation Requirements

### Mapping Strategy

| WTF Concept | 530 Source | Transformation |
|-------------|------------|----------------|
| **Episode** | Time-based grouping | Create virtual episodes by date/time |
| **ContentBlock** | Tags (root categories) | Map root tags → ContentBlocks |
| **ContentBlockItem** | Tagged post | Map tagged_posts → ContentBlockItems |
| **Content** | Post metadata | Transform post data → LiveViewContent |

### Transformation Logic

```typescript
// Pseudo-code for transformation
async function transformToWTFFormat(episodeDate: Date) {
  // 1. Create Episode
  const episodeId = `episode-${episodeDate.toISOString()}`;

  // 2. Get all tagged posts for this date range
  const posts = await supabase
    .from('tagged_posts')
    .select('*')
    .gte('timestamp', startOfDay(episodeDate))
    .lte('timestamp', endOfDay(episodeDate));

  // 3. Get tag hierarchy
  const tags = await supabase
    .from('tags')
    .select('*')
    .order('depth', { ascending: true });

  // 4. Group posts by root tag category
  const rootTags = tags.filter(t => t.parent_id === null);

  const contentBlocks: LiveViewContentBlock[] = rootTags.map(rootTag => {
    // Find all posts tagged with this root tag or its children
    const relevantPosts = posts.filter(post =>
      post.tags.some(tagSlug =>
        isDescendantOf(tagSlug, rootTag.slug, tags)
      )
    );

    return {
      id: rootTag.id,
      title: rootTag.name,
      weight: 0,
      episode_id: episodeId,
      description: rootTag.description || '',
      content_block_items: relevantPosts.map((post, index) => ({
        id: post.id,
        note: '', // Could use tweet_text or custom notes
        weight: index,
        content_block_id: rootTag.id,
        news_id: post.tweet_id,
        content: {
          id: post.id,
          version: 1,
          content_type: 'twitter',
          content_url: post.url,
          content_id: post.tweet_id,
          content_created_at: post.timestamp,
          thumbnail_url: null, // Need to extract from tweet
          submitted_by: post.user_id,
          submitted_at: post.created_at,
          category: post.category,
          categories: post.tags, // Array of tag slugs
          description: post.tweet_text
        }
      }))
    };
  });

  return contentBlocks;
}
```

---

## 4. Missing Database Schema Elements

### Need to Add: Episodes Table

```sql
CREATE TABLE episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  date date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### Need to Add: Content Blocks Table (Optional)

```sql
CREATE TABLE content_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid REFERENCES episodes(id),
  tag_id uuid REFERENCES tags(id), -- Link to root tag
  title text NOT NULL,
  description text,
  weight integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);
```

### Need to Add: Content Block Items Table (Optional)

```sql
CREATE TABLE content_block_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_block_id uuid REFERENCES content_blocks(id),
  post_id text REFERENCES tagged_posts(id),
  note text,
  weight integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);
```

**Decision Point**: Should we create actual database tables or generate these structures dynamically from queries?

---

## 5. Critical Integration Decisions

### Decision 1: Database Schema Approach

**Option A: Add New Tables (episodes, content_blocks, content_block_items)**
- ✅ Explicit structure, easier to query
- ✅ Can cache episode data
- ✅ Better performance for repeated queries
- ❌ More complex migration
- ❌ Redundant data (posts exist in tagged_posts)

**Option B: Dynamic Generation via API**
- ✅ No schema changes required
- ✅ Always reflects current tagged_posts
- ✅ Simpler to implement initially
- ❌ Repeated computation on each request
- ❌ Need caching strategy

**Recommendation**: Start with **Option B** (dynamic generation) for MVP, migrate to **Option A** if performance becomes an issue.

---

### Decision 2: Episode Creation Strategy

**Option A: Daily Episodes**
- Group posts by calendar day
- `episode_id = "2025-10-11"`

**Option B: Manual Episodes**
- Admin creates episodes with date ranges
- Curated content selection

**Option C: Tag-Based Episodes**
- Each root tag becomes its own "episode"
- Multiple concurrent episodes

**Recommendation**: **Option A** (Daily Episodes) for MVP - simple, automatic, scalable.

---

### Decision 3: Post-to-Category Mapping

**Challenge**: A post can have multiple tags (e.g., ["ai-art", "llm", "ethics"])

**Option A: Duplicate Posts**
- Post appears in multiple ContentBlocks
- ✅ User sees post in all relevant categories
- ❌ Duplicated data in WTF

**Option B: Primary Category Only**
- Post appears in first/primary tag's category
- ✅ No duplication
- ❌ Post only visible in one place

**Option C: Multi-Category Indicator**
- Post appears in primary category with badge showing other categories
- ✅ No duplication
- ✅ User aware of cross-category relevance

**Recommendation**: **Option A** (Duplicate Posts) - WTF expects this pattern, users benefit from seeing content in context.

---

### Decision 4: Thumbnail/Media Extraction

**Challenge**: Twitter posts don't include thumbnail_url in our current schema

**Option A: Extract on Demand**
- When transforming for WTF, fetch tweet metadata via Twitter API
- ❌ Slow, rate-limited

**Option B: Pre-fetch During Tagging**
- Extension extracts thumbnail when user tags post
- Store in tagged_posts.thumbnail_url
- ✅ Fast, no API calls later

**Option C: Use Placeholder**
- Show generic thumbnail for now
- ✅ Fast implementation
- ❌ Poor UX

**Recommendation**: **Option B** (Pre-fetch) - Requires extension update to capture thumbnails.

---

## 6. Implementation Phases

### Phase 1: Data Analysis & Planning ✅ CURRENT
- [x] Review WTF documentation
- [x] Map 530 schema to WTF requirements
- [x] Identify transformation logic
- [ ] Document critical decisions
- [ ] Get stakeholder approval on decisions

### Phase 2: API Development
- [ ] Create `/api/episodes/[date]` endpoint
- [ ] Implement transformation function
- [ ] Add caching layer (Redis or Next.js cache)
- [ ] Test with sample data

### Phase 3: Schema Enhancements
- [ ] Add `thumbnail_url` to tagged_posts
- [ ] Update Chrome extension to capture thumbnails
- [ ] (Optional) Add episodes table if needed

### Phase 4: WTF Integration
- [ ] Create Next.js page at `/web/episodes/[date]`
- [ ] Fetch data from API
- [ ] Pass to WTF component
- [ ] Test navigation and interactions

### Phase 5: Polish & Features
- [ ] Add callbacks for analytics
- [ ] Enable audio reactivity (optional)
- [ ] Add keyboard/swipe navigation
- [ ] Style details panel
- [ ] Add episode selector UI

---

## 7. API Endpoint Design

### GET `/api/episodes/[date]`

**Request**:
```
GET /api/episodes/2025-10-11
```

**Response**:
```json
{
  "episodeId": "episode-2025-10-11",
  "title": "Daily Digest - October 11, 2025",
  "date": "2025-10-11",
  "contentBlocks": [
    {
      "id": "ba4a4cdb-9470-4395-af34-469821cc8d7a",
      "title": "Artificial Intelligence",
      "weight": 0,
      "episode_id": "episode-2025-10-11",
      "description": "AI, machine learning, and related technologies",
      "content_block_items": [
        {
          "id": "post-abc123",
          "note": "",
          "weight": 0,
          "content_block_id": "ba4a4cdb-9470-4395-af34-469821cc8d7a",
          "news_id": "1234567890",
          "content": {
            "id": "post-abc123",
            "version": 1,
            "content_type": "twitter",
            "content_url": "https://x.com/user/status/1234567890",
            "content_id": "1234567890",
            "content_created_at": "2025-10-11T10:30:00Z",
            "thumbnail_url": "https://pbs.twimg.com/media/...",
            "submitted_by": "anonymous",
            "submitted_at": "2025-10-11T11:00:00Z",
            "category": "ai",
            "categories": ["ai-art", "llm"],
            "description": "Amazing new AI art tool just dropped!"
          }
        }
      ]
    }
  ]
}
```

---

## 8. Next Steps & Open Questions

### Questions for Stakeholders

1. **Episode Strategy**: Do we want daily auto-generated episodes or manually curated ones?
2. **Multi-Category Posts**: Should posts appear in multiple categories (recommended) or just one?
3. **Performance**: Are we okay with API generation or do we need database tables?
4. **Thumbnails**: Should we update the extension now to capture thumbnails, or use placeholders initially?
5. **WTF Plugins**: Do we want audio reactivity enabled? Development controls?

### Technical Decisions Needed

1. **Caching Strategy**:
   - Use Next.js built-in caching
   - Redis for cross-instance caching
   - Supabase function caching

2. **Real-time Updates**:
   - Should WTF content update live as new posts are tagged?
   - Use Supabase realtime subscriptions?

3. **User Interactions**:
   - What analytics do we track? (onItemChange, onItemClick)
   - Do we want users to tag from within WTF?

---

## 9. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Performance issues with large datasets | High | Implement pagination, caching, lazy loading |
| Complex transformation logic | Medium | Write comprehensive tests, start simple |
| Missing tweet thumbnails | Low | Add placeholder, then enhance extension |
| WTF library changes | Medium | Pin version, monitor releases |
| User confusion with 3D interface | Medium | Add tutorial, keep 2D fallback option |

---

## 10. Success Criteria

### MVP Success
- [ ] Can view tagged posts in 3D visualization
- [ ] Posts grouped by root tag categories
- [ ] Navigation works (keyboard/swipe)
- [ ] Details panel shows post content
- [ ] Performance acceptable (<2s load time)

### Full Success
- [ ] Daily episodes auto-generated
- [ ] Thumbnails displayed correctly
- [ ] Audio reactivity enabled
- [ ] Analytics tracking user interactions
- [ ] Mobile-friendly

---

## 11. Code Changes Required

### Minimal Changes to WTF (/web/wtf)
- ✅ No changes needed if we provide correct data format
- ❌ Avoid modifying WTF unless absolutely necessary

### New Files to Create
1. `/web/app/api/episodes/[date]/route.ts` - API endpoint
2. `/web/app/episodes/[date]/page.tsx` - WTF viewer page
3. `/web/lib/transformers/wtf-transformer.ts` - Data transformation logic
4. `/web/lib/supabase/queries/episodes.ts` - Database queries

### Files to Modify
1. `/extension/public/content.js` - Add thumbnail extraction
2. `/supabase/migrations/[timestamp]_add_thumbnail_url.sql` - Schema update

---

*Generated: October 11, 2025*
*Phase: 1 - Analysis*
*Next Phase: API Development (pending stakeholder approval)*
