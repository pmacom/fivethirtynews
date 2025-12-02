# Tag Hierarchy System

The 530 project uses a **Materialized Path** pattern for managing hierarchical tags. This is an industry best-practice approach that provides excellent query performance while maintaining flexibility.

## Architecture

### Database Schema

**`tags` table** - Stores the hierarchical tag structure:
```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES tags(id),  -- Points to parent tag
  path TEXT[],                         -- Array path from root: ['Technology', 'AI', 'Machine Learning']
  depth INTEGER,                       -- 0 = root, 1 = first level, etc.
  description TEXT,
  icon TEXT,
  color TEXT,
  is_system BOOLEAN,                   -- System tags can't be deleted
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Key Features

1. **Materialized Path** (`path` column)
   - Stores complete path from root to current node
   - Example: `['Technology', 'Artificial Intelligence', 'Machine Learning']`
   - Enables fast ancestor/descendant queries using array operations
   - Automatically updated via trigger when parent changes

2. **Depth Tracking** (`depth` column)
   - Root tags have depth 0
   - Each level increments by 1
   - Makes it easy to query by level

3. **Circular Reference Prevention**
   - Database trigger prevents tags from becoming their own ancestor
   - Maintains data integrity automatically

## Current Hierarchy

```
Action (0)
├── Archive (1)
├── Bookmark (1)
├── Follow Up (1)
├── Read Later (1)
├── Research (1)
└── Share (1)

Content Type (0)
├── Article (1)
├── Meme (1)
├── News (1)
├── Opinion (1)
├── Question (1)
├── Thread (1)
└── Tutorial (1)

Quality (0)
├── Controversial (1)
├── Funny (1)
├── Important (1)
├── Inspirational (1)
├── Interesting (1)
└── Must Read (1)

Technology (0)
├── Artificial Intelligence (1)
│   ├── Computer Vision (2)
│   ├── Machine Learning (2)
│   └── Natural Language Processing (2)
├── Blockchain (1)
└── Web Development (1)

And more...
```

## Helper Functions

### 1. Get Tag Tree
```sql
SELECT * FROM get_tag_tree();
```
Returns complete hierarchy with full paths and child counts.

### 2. Get Tag Children (Recursive)
```sql
SELECT * FROM get_tag_children('tag-uuid-here');
```
Returns all descendants of a tag (children, grandchildren, etc.).

### 3. Get Tag Ancestors
```sql
SELECT * FROM get_tag_ancestors('tag-uuid-here');
```
Returns all ancestors of a tag (parent, grandparent, etc.).

### 4. Find or Create Tag
```sql
SELECT find_or_create_tag(
  'Machine Learning',           -- tag name
  'Artificial Intelligence',    -- parent tag name (optional)
  'ML algorithms and models',   -- description (optional)
  '🤖',                         -- icon (optional)
  '#667eea'                     -- color (optional)
);
```
Finds existing tag or creates new one with parent relationship.

## Usage Examples

### Creating New Tags

**Create a root tag:**
```sql
INSERT INTO tags (name, description, icon)
VALUES ('Music', 'Music-related content', '🎵');
```

**Create a child tag:**
```sql
INSERT INTO tags (name, parent_id, description)
VALUES (
  'Jazz',
  (SELECT id FROM tags WHERE name = 'Music'),
  'Jazz music and artists'
);
```

**Create nested tags (3 levels deep):**
```sql
-- Using the helper function
SELECT find_or_create_tag('Bebop', 'Jazz', 'Bebop jazz style');
```

### Querying Tags

**Get all root tags (no parent):**
```sql
SELECT * FROM tags WHERE parent_id IS NULL;
```

**Get direct children of a tag:**
```sql
SELECT * FROM tags
WHERE parent_id = (SELECT id FROM tags WHERE name = 'Technology');
```

**Get all descendants (using path):**
```sql
SELECT * FROM tags
WHERE path @> ARRAY['Technology'];
```

**Get tag with full path:**
```sql
SELECT
  name,
  array_to_string(path, ' > ') as full_path,
  depth
FROM tags
WHERE name = 'Machine Learning';

-- Result: Technology > Artificial Intelligence > Machine Learning, depth: 2
```

**Search tags by partial name:**
```sql
SELECT name, array_to_string(path, ' > ') as full_path
FROM tags
WHERE name ILIKE '%learn%';
```

### Moving Tags

**Change a tag's parent:**
```sql
UPDATE tags
SET parent_id = (SELECT id FROM tags WHERE name = 'Science')
WHERE name = 'Biology';
-- Path and depth are automatically updated by trigger
```

### Deleting Tags

**Delete a tag (children become orphans):**
```sql
DELETE FROM tags WHERE name = 'Old Tag';
-- Children's parent_id becomes NULL
```

**Delete tag and all descendants:**
```sql
DELETE FROM tags
WHERE id IN (
  SELECT id FROM get_tag_children('parent-tag-uuid')
);
```

## Best Practices

### 1. Tag Naming
- Use clear, descriptive names
- Be consistent with capitalization
- Avoid special characters (except spaces and hyphens)
- Keep names concise (2-3 words max)

### 2. Hierarchy Design
- **Max 4-5 levels deep** - Deeper hierarchies become hard to navigate
- **5-10 children per parent** - Too many siblings is overwhelming
- **Use breadth over depth** - Prefer more root categories over deep nesting

### 3. System Tags
- Mark core categories as `is_system = true`
- Prevents accidental deletion
- Shows users which are "official" categories

### 4. Performance
- The materialized path pattern is very performant
- Ancestor queries: `O(1)` using array contains operator
- Descendant queries: `O(1)` using array contains operator
- Moving nodes: `O(descendants)` due to path updates

## Integration with Chrome Extension

The Chrome extension currently uses a simplified approach with `tagged_posts.tags` as JSONB. To integrate with the proper hierarchy:

```javascript
// When saving a tag in the extension
const tagId = await supabase.rpc('find_or_create_tag', {
  tag_name: 'Machine Learning',
  parent_tag_name: 'Artificial Intelligence'
});

// Then link to post
await supabase.from('post_tags').insert({
  post_id: postId,
  tag_id: tagId,
  user_id: userId
});
```

## Migration Path

**Current:** Simple JSONB tags in `tagged_posts`
**Future:** Full hierarchy with `tags` + `post_tags` tables

Benefits of migration:
- True hierarchical queries
- Tag statistics and trending
- Tag suggestions based on hierarchy
- Community-driven tag evolution
- Deduplication and standardization

## Resources

- [PostgreSQL Array Functions](https://www.postgresql.org/docs/current/functions-array.html)
- [Materialized Path Pattern](https://www.slideshare.net/billkarwin/models-for-hierarchical-data)
- [PostgreSQL Recursive CTEs](https://www.postgresql.org/docs/current/queries-with.html)
