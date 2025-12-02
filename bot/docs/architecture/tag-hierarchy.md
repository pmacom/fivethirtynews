# Tag Hierarchy Architecture

**Version**: 1.0
**Last Updated**: 2025-10-10
**Purpose**: Deep dive into flexible tag reparenting and hierarchy management

---

## Philosophy

The 530 Project uses a **flexible hierarchical tagging system** where:
- Tags can have parent-child relationships (e.g., Technology → AI → Machine Learning)
- Tags can be **reparented** without breaking existing post associations
- Users collaboratively build the hierarchy organically
- No strict taxonomy enforced—community decides structure

**Key Design Goal**: Allow moderators to reorganize tags as understanding evolves, without losing data.

---

## Hierarchy Implementation

### Storage Model: Adjacency List + Materialized Path

We use a **hybrid approach** combining two patterns:

#### 1. Adjacency List (parent_id)
```sql
tags (
  id UUID,
  name TEXT,
  parent_id UUID REFERENCES tags(id)  -- Points to direct parent
)
```

**Pros**:
- Simple to update (just change parent_id)
- Easy to understand
- Efficient for inserting new tags

**Cons**:
- Slow for "get all descendants" queries (requires recursive CTE)

#### 2. Materialized Path (path array)
```sql
tags (
  ...
  path TEXT[]  -- ['Technology', 'AI', 'Machine Learning']
)
```

**Pros**:
- Fast "get all descendants" queries using GIN index
- Easy to display breadcrumb navigation
- Single query to find all children

**Cons**:
- Must update all descendants when ancestor changes name or position

**Hybrid Solution**: Use both! `parent_id` for updates, `path` for queries.

---

## Data Structure Examples

### Example 1: Simple Hierarchy

```
Technology
├── Artificial Intelligence
│   ├── Machine Learning
│   ├── Neural Networks
│   └── Natural Language Processing
├── Blockchain
│   ├── Bitcoin
│   └── Ethereum
└── Web Development
    ├── Frontend
    └── Backend
```

**Database Representation**:
```sql
-- Root tag
INSERT INTO tags (id, name, parent_id, path)
VALUES ('tech-uuid', 'Technology', NULL, ARRAY['Technology']);

-- Level 1
INSERT INTO tags (id, name, parent_id, path)
VALUES
  ('ai-uuid', 'Artificial Intelligence', 'tech-uuid',
   ARRAY['Technology', 'Artificial Intelligence']),
  ('blockchain-uuid', 'Blockchain', 'tech-uuid',
   ARRAY['Technology', 'Blockchain']);

-- Level 2
INSERT INTO tags (id, name, parent_id, path)
VALUES
  ('ml-uuid', 'Machine Learning', 'ai-uuid',
   ARRAY['Technology', 'Artificial Intelligence', 'Machine Learning']);
```

### Example 2: After Reparenting

**Scenario**: Move "Machine Learning" from under "AI" to directly under "Technology"

**Before**:
```
Technology → Artificial Intelligence → Machine Learning
```

**After**:
```
Technology → Machine Learning
```

**SQL**:
```sql
UPDATE tags
SET parent_id = 'tech-uuid'
WHERE id = 'ml-uuid';

-- Trigger automatically updates path:
-- Old: ['Technology', 'Artificial Intelligence', 'Machine Learning']
-- New: ['Technology', 'Machine Learning']
```

**Impact**:
- ✅ All posts tagged with "Machine Learning" remain tagged
- ✅ Path updates automatically (via trigger)
- ✅ No breaking changes to `post_tags` table

---

## Path Update Trigger

**Purpose**: Automatically maintain the `path` array when tags are moved or renamed.

```sql
CREATE OR REPLACE FUNCTION update_tag_path()
RETURNS TRIGGER AS $$
BEGIN
  -- If tag has no parent, it's a root tag
  IF NEW.parent_id IS NULL THEN
    NEW.path := ARRAY[NEW.name];
  ELSE
    -- Concatenate parent's path with current tag name
    SELECT path || NEW.name INTO NEW.path
    FROM tags WHERE id = NEW.parent_id;
  END IF;

  -- Update timestamp
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tag_path
BEFORE INSERT OR UPDATE OF parent_id, name ON tags
FOR EACH ROW EXECUTE FUNCTION update_tag_path();
```

**When Triggered**:
- New tag inserted → Sets initial path
- `parent_id` changed → Recalculates path
- Tag `name` changed → Updates path for tag and all descendants

**Cascade Updates**:
When a parent tag is renamed, all children must update their paths:

```sql
-- Update parent name
UPDATE tags SET name = 'Tech' WHERE name = 'Technology';

-- Trigger updates this tag's path: ['Tech']

-- But children still have old paths: ['Technology', 'AI']
-- Need to cascade update children:

CREATE OR REPLACE FUNCTION cascade_update_paths()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all descendants' paths
  UPDATE tags
  SET path = (
    SELECT ARRAY(
      SELECT unnest(path[1:array_position(path, OLD.name)-1]) || NEW.name || unnest(path[array_position(path, OLD.name)+1:])
    )
  )
  WHERE path @> ARRAY[OLD.name] AND id != NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cascade_paths
AFTER UPDATE OF name ON tags
FOR EACH ROW EXECUTE FUNCTION cascade_update_paths();
```

---

## Common Operations

### 1. Create Root Tag

```sql
INSERT INTO tags (name, parent_id, created_by)
VALUES ('Politics', NULL, 'user-uuid-123');

-- Result:
-- id: auto-generated UUID
-- name: 'Politics'
-- parent_id: NULL
-- path: ['Politics']
```

### 2. Create Child Tag

```sql
INSERT INTO tags (name, parent_id, created_by)
VALUES (
  'US Politics',
  (SELECT id FROM tags WHERE name = 'Politics'),
  'user-uuid-123'
);

-- Result:
-- path: ['Politics', 'US Politics']
```

### 3. Move Tag to Different Parent (Reparent)

```sql
-- Before: Politics → US Politics → Election 2024
-- After:  News → Election 2024

UPDATE tags
SET parent_id = (SELECT id FROM tags WHERE name = 'News')
WHERE name = 'Election 2024';

-- Result:
-- Old path: ['Politics', 'US Politics', 'Election 2024']
-- New path: ['News', 'Election 2024']
```

### 4. Convert Child to Root Tag

```sql
UPDATE tags
SET parent_id = NULL
WHERE name = 'Machine Learning';

-- Result:
-- Old path: ['Technology', 'AI', 'Machine Learning']
-- New path: ['Machine Learning']
```

### 5. Get All Descendants

```sql
-- Find all tags under "Technology" (including nested children)
SELECT * FROM tags
WHERE path @> ARRAY['Technology']  -- Contains operator, uses GIN index
ORDER BY path;

-- Result:
-- Technology
-- Technology → AI
-- Technology → AI → Machine Learning
-- Technology → Blockchain
-- etc.
```

### 6. Get Immediate Children Only

```sql
SELECT * FROM tags
WHERE parent_id = (SELECT id FROM tags WHERE name = 'Technology');

-- Result (level 1 only):
-- Artificial Intelligence
-- Blockchain
-- Web Development
```

### 7. Get Tag Path (Breadcrumb)

```sql
SELECT path FROM tags WHERE name = 'Machine Learning';

-- Result: ['Technology', 'Artificial Intelligence', 'Machine Learning']

-- Display as breadcrumb:
-- Technology > Artificial Intelligence > Machine Learning
```

### 8. Find Orphaned Tags

```sql
-- Tags with no parent, no children, and no posts
SELECT t.*
FROM tags t
LEFT JOIN tags children ON t.id = children.parent_id
LEFT JOIN post_tags pt ON t.id = pt.tag_id
WHERE t.parent_id IS NULL
  AND children.id IS NULL
  AND pt.tag_id IS NULL;
```

---

## UI/UX Considerations

### Tag Selector (Extension Popup)

**User Flow**:
1. User clicks "530" button on X.com post
2. Modal opens showing tag hierarchy as tree view
3. User can:
   - Select existing tag
   - Create new tag (with autocomplete)
   - Choose parent for new tag

**Implementation**:
```typescript
// Fetch hierarchy from API
const tags = await supabase
  .from('tags')
  .select('id, name, parent_id, path')
  .order('path');

// Build tree structure
const tree = buildTree(tags);

function buildTree(tags) {
  const map = new Map();
  const roots = [];

  tags.forEach(tag => {
    map.set(tag.id, { ...tag, children: [] });
  });

  tags.forEach(tag => {
    if (tag.parent_id) {
      map.get(tag.parent_id)?.children.push(map.get(tag.id));
    } else {
      roots.push(map.get(tag.id));
    }
  });

  return roots;
}
```

**React Component** (pseudocode):
```tsx
function TagSelector({ onSelect }) {
  const [tags, setTags] = useState([]);
  const [selected, setSelected] = useState(null);

  return (
    <div>
      <TreeView data={tags} onSelect={setSelected} />
      <Input placeholder="Or create new tag..." />
      <Button onClick={() => onSelect(selected)}>Save</Button>
    </div>
  );
}
```

### Admin UI Tag Management

**Features**:
1. **Tree View**: Drag-and-drop to reparent tags
2. **Merge Tags**: Combine duplicates (e.g., "AI" and "Artificial Intelligence")
3. **Rename**: Update tag name (cascades to all paths)
4. **Delete**: Remove tag (reassign posts or orphan them)

**Drag-and-Drop Example**:
```typescript
async function reparentTag(tagId: string, newParentId: string | null) {
  const { error } = await supabase
    .from('tags')
    .update({ parent_id: newParentId })
    .eq('id', tagId);

  if (!error) {
    // Trigger automatically updates path
    toast.success('Tag moved successfully');
  }
}
```

**Merge Tags**:
```sql
-- Merge "AI" into "Artificial Intelligence"
BEGIN;

-- Update all post_tags associations
UPDATE post_tags
SET tag_id = 'ai-full-uuid'
WHERE tag_id = 'ai-short-uuid';

-- Update children to point to merged tag
UPDATE tags
SET parent_id = 'ai-full-uuid'
WHERE parent_id = 'ai-short-uuid';

-- Delete old tag
DELETE FROM tags WHERE id = 'ai-short-uuid';

COMMIT;
```

---

## Performance Optimization

### Indexes

```sql
-- Fast parent lookup
CREATE INDEX idx_tags_parent_id ON tags(parent_id);

-- Fast path queries (contains operator)
CREATE INDEX idx_tags_path ON tags USING GIN(path);

-- Fast name search
CREATE INDEX idx_tags_name ON tags(name);

-- Fast user attribution
CREATE INDEX idx_tags_created_by ON tags(created_by);
```

### Caching Strategy

**Extension**:
- Cache full tag hierarchy in IndexedDB
- Refresh every 5 minutes or on user action
- Background sync when online

```typescript
// Cache tags in IndexedDB
async function cacheTagHierarchy() {
  const tags = await supabase.from('tags').select('*');
  await db.tags.bulkPut(tags.data);
}

// Load from cache first, then refresh
async function getTagHierarchy() {
  const cached = await db.tags.toArray();
  if (cached.length > 0) {
    // Show cached data immediately
    displayTags(cached);
  }

  // Refresh in background
  const fresh = await supabase.from('tags').select('*');
  if (JSON.stringify(fresh.data) !== JSON.stringify(cached)) {
    await db.tags.bulkPut(fresh.data);
    displayTags(fresh.data);
  }
}
```

**Admin UI**:
- Server-side rendering with ISR (Incremental Static Regeneration)
- Revalidate every 60 seconds
- Real-time updates via Supabase Realtime for live editing sessions

---

## Edge Cases & Solutions

### 1. Circular References

**Problem**: User sets parent_id to point to a descendant (creates cycle)

**Solution**: Add constraint check before update
```sql
CREATE OR REPLACE FUNCTION prevent_circular_parent()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if new parent is a descendant
  IF EXISTS (
    SELECT 1 FROM tags
    WHERE id = NEW.parent_id
    AND path @> ARRAY[NEW.name]
  ) THEN
    RAISE EXCEPTION 'Circular reference detected: tag cannot be its own ancestor';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_circular
BEFORE UPDATE OF parent_id ON tags
FOR EACH ROW EXECUTE FUNCTION prevent_circular_parent();
```

### 2. Deep Nesting (10+ levels)

**Problem**: Path becomes very long, slow to query

**Solution**:
- Limit depth to 5 levels in UI
- Show warning when creating 6th level
- Consider flattening over-nested hierarchies

### 3. Duplicate Names in Different Branches

**Problem**: Two "Security" tags under "Technology" and "Politics"

**Solution**:
- Allow duplicate names (different UUIDs)
- Display full path in UI: "Technology > Security" vs "Politics > Security"
- Unique constraint is on `(name, parent_id)` not just `name`

### 4. Deleting Tag with Children

**Problem**: User deletes "Technology" but it has 50 child tags

**Solution**: Three options in UI:
1. **Move children to parent's parent** (make them siblings of deleted tag)
2. **Delete entire subtree** (cascade delete—requires confirmation)
3. **Convert children to root tags** (orphan them)

```sql
-- Option 1: Move children up one level
UPDATE tags
SET parent_id = (SELECT parent_id FROM tags WHERE id = 'tech-uuid')
WHERE parent_id = 'tech-uuid';

-- Option 2: Cascade delete (RLS handles this if configured)
DELETE FROM tags WHERE id = 'tech-uuid';  -- Cascades to children

-- Option 3: Orphan children (default with ON DELETE SET NULL)
DELETE FROM tags WHERE id = 'tech-uuid';  -- Children become roots
```

---

## Real-Time Collaboration

**Scenario**: Two moderators editing tag hierarchy simultaneously

**Solution**: Use Supabase Realtime

```typescript
// Subscribe to tag changes
const channel = supabase
  .channel('tag-changes')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'tags' },
    (payload) => {
      if (payload.eventType === 'UPDATE') {
        // Refresh tag tree in UI
        refreshTagTree();
        toast.info(`Tag "${payload.new.name}" was updated by another user`);
      }
    }
  )
  .subscribe();
```

---

## Migration Strategy

### From Flat Tags to Hierarchy

**Scenario**: Starting with flat tags like `['ai', 'machine-learning', 'tech']`, want to organize hierarchically

**Migration Script**:
```sql
BEGIN;

-- Create parent tags
INSERT INTO tags (name, parent_id) VALUES ('Technology', NULL);

-- Update existing tags to have parents
UPDATE tags SET parent_id = (SELECT id FROM tags WHERE name = 'Technology')
WHERE name IN ('ai', 'machine-learning', 'blockchain');

-- Trigger updates paths automatically

COMMIT;
```

---

## Testing Checklist

- [ ] Create root tag
- [ ] Create child tag (2 levels deep)
- [ ] Create deeply nested tag (5 levels)
- [ ] Reparent tag from one branch to another
- [ ] Rename tag and verify paths update
- [ ] Delete tag with children (test all 3 options)
- [ ] Try to create circular reference (should fail)
- [ ] Query all descendants of a tag
- [ ] Merge two duplicate tags
- [ ] Real-time update across two browser sessions

---

## Future Enhancements

### 1. Polyhierarchy (Multiple Parents)

**Scenario**: "Security" could belong under both "Technology" and "Politics"

**Implementation**: Add `tag_relationships` table
```sql
CREATE TABLE tag_relationships (
  parent_id UUID REFERENCES tags(id),
  child_id UUID REFERENCES tags(id),
  PRIMARY KEY (parent_id, child_id)
);
```

### 2. Tag Aliases

**Scenario**: "AI" and "Artificial Intelligence" refer to same concept

**Implementation**: Add `aliases` array to tags
```sql
ALTER TABLE tags ADD COLUMN aliases TEXT[];

-- User searches "AI" → finds tag with alias "AI" → actual name is "Artificial Intelligence"
```

### 3. Tag Voting/Popularity

**Scenario**: Community votes on whether "Machine Learning" should be under "AI" or "Technology"

**Implementation**: Track reparenting suggestions with votes
```sql
CREATE TABLE tag_reparent_suggestions (
  id UUID PRIMARY KEY,
  tag_id UUID REFERENCES tags(id),
  proposed_parent_id UUID REFERENCES tags(id),
  suggested_by UUID REFERENCES users(id),
  votes_for INTEGER DEFAULT 0,
  votes_against INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending'  -- 'pending', 'approved', 'rejected'
);
```

---

## Related Documentation

- `/docs/architecture/database-schema.md` - Full schema definition with indexes
- `/docs/architecture/system-overview.md` - How tags fit into overall architecture
- `/docs/development/quickstart.md` - Test tag operations locally

---

**Key Takeaway**: The flexible hierarchy system allows organic growth and reorganization without breaking existing data, making it perfect for community-curated content discovery.
