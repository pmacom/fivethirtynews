# WTF Integration Guide for External Libraries

## Overview

This document provides guidance for:
1. **WTF Developers**: How to adapt WTF data structures for external library integration
2. **External Library Developers**: How to design your library to be WTF-compatible

---

## For WTF Developers: Data Adaptation Strategies

### Current Data Structure Analysis

**Strengths:**
- ✅ Clear hierarchical structure (Category → Items → Content)
- ✅ Flexible content typing (video, twitter, image, etc.)
- ✅ Built-in sorting via `weight` fields
- ✅ Comprehensive metadata tracking

**Potential Improvements for Library Integration:**

#### 1. Create Data Adapters

Instead of requiring external libraries to match your exact structure, create adapter functions:

```typescript
// src/wtf/adapters/LibraryAdapter.ts

interface GenericLibraryContent {
  // Define what most libraries provide
  id: string;
  title: string;
  items: {
    id: string;
    url: string;
    thumbnail?: string;
    metadata?: Record<string, any>;
  }[];
}

export function adaptLibraryToWTF(
  libraryData: GenericLibraryContent[]
): LiveViewContentBlock[] {
  return libraryData.map((category, index) => ({
    // Map library structure to WTF structure
    id: category.id,
    title: category.title,
    weight: index,
    episode_id: 'external-library',
    description: category.metadata?.description || '',
    content_block_items: category.items.map((item, itemIndex) => ({
      id: item.id,
      note: item.metadata?.note || item.title || '',
      weight: itemIndex,
      content_block_id: category.id,
      news_id: item.id,
      content: {
        id: item.id,
        version: 1,
        content_type: detectContentType(item.url),
        content_url: item.url,
        content_id: extractContentId(item.url),
        content_created_at: item.metadata?.createdAt || new Date().toISOString(),
        thumbnail_url: item.thumbnail || generateThumbnail(item.url),
        submitted_by: 'external-library',
        submitted_at: new Date().toISOString(),
        category: category.title,
        categories: item.metadata?.tags || [],
        description: item.metadata?.description || ''
      }
    }))
  }));
}
```

#### 2. Simplify Required Fields

**Current Issues:**
- Too many required fields that may not be relevant
- Timestamps might not be available from external sources
- Metadata like `submitted_by` may not exist

**Proposed Changes:**

```typescript
// src/wtf/Content/types.ts

// Create a simplified version for external integrations
export interface SimplifiedContent {
  // ABSOLUTELY REQUIRED
  id: string;
  url: string;
  thumbnail: string;

  // OPTIONAL (with sensible defaults)
  title?: string;              // Default: "Untitled"
  description?: string;        // Default: ""
  type?: ContentType;          // Default: auto-detect from URL
  metadata?: Record<string, any>;  // Flexible metadata
}

export interface SimplifiedContentBlock {
  // ABSOLUTELY REQUIRED
  id: string;
  title: string;
  items: SimplifiedContent[];

  // OPTIONAL
  order?: number;              // Default: array index
  description?: string;        // Default: ""
}

// Then convert to full structure internally
export function expandToFullStructure(
  simplified: SimplifiedContentBlock[]
): LiveViewContentBlock[] {
  return simplified.map((block, blockIndex) => ({
    id: block.id,
    title: block.title,
    weight: block.order ?? blockIndex,
    episode_id: 'default',
    description: block.description || '',
    content_block_items: block.items.map((item, itemIndex) => ({
      id: item.id,
      note: item.title || '',
      weight: itemIndex,
      content_block_id: block.id,
      news_id: item.id,
      content: {
        id: item.id,
        version: 1,
        content_type: item.type || detectContentType(item.url),
        content_url: item.url,
        content_id: extractContentId(item.url),
        content_created_at: item.metadata?.createdAt || new Date().toISOString(),
        thumbnail_url: item.thumbnail,
        submitted_by: item.metadata?.submittedBy || 'external',
        submitted_at: new Date().toISOString(),
        category: block.title,
        categories: item.metadata?.tags || [],
        description: item.description || ''
      }
    }))
  }));
}
```

#### 3. Add Schema Validation with Helpful Errors

```typescript
// src/wtf/utils/validation.ts

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export function validateAndSuggest(
  data: any
): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    suggestions: []
  };

  // Check if it's an array
  if (!Array.isArray(data)) {
    result.valid = false;
    result.errors.push('Content must be an array of categories');
    result.suggestions.push('Wrap your data in an array: [yourData]');
    return result;
  }

  // Check each category
  data.forEach((block, blockIndex) => {
    if (!block.id) {
      result.errors.push(`Category ${blockIndex} missing 'id' field`);
      result.suggestions.push(`Add: id: "category-${blockIndex}"`);
    }

    if (!block.title) {
      result.errors.push(`Category ${blockIndex} missing 'title' field`);
      result.suggestions.push(`Add: title: "Category ${blockIndex}"`);
    }

    if (!block.content_block_items && !block.items) {
      result.errors.push(`Category ${blockIndex} has no items`);
      result.suggestions.push('Add: content_block_items: [...] or items: [...]');
    }

    // Check for common naming variations
    if (block.name && !block.title) {
      result.warnings.push(`Category ${blockIndex} uses 'name' instead of 'title'`);
      result.suggestions.push('Rename: name → title');
    }
  });

  result.valid = result.errors.length === 0;
  return result;
}

// Use in WTF component
export const WTF = ({ content, ...props }: WTFProps) => {
  useEffect(() => {
    const validation = validateAndSuggest(content);

    if (!validation.valid) {
      console.error('WTF Content Validation Errors:', validation.errors);
      console.info('Suggestions:', validation.suggestions);
    }

    if (validation.warnings.length > 0) {
      console.warn('WTF Content Warnings:', validation.warnings);
    }
  }, [content]);

  // ... rest of component
};
```

#### 4. Support Multiple Input Formats

```typescript
// src/wtf/WTF.tsx

interface WTFPropsFlexible {
  // Accept multiple formats
  content?: LiveViewContentBlock[];           // Full format
  simpleContent?: SimplifiedContentBlock[];   // Simplified format
  libraryContent?: any;                       // Auto-detect and adapt
  contentAdapter?: (data: any) => LiveViewContentBlock[];  // Custom adapter

  // ... other props
}

export const WTF = ({
  content,
  simpleContent,
  libraryContent,
  contentAdapter,
  ...props
}: WTFPropsFlexible) => {

  // Determine which content format was provided
  const processedContent = useMemo(() => {
    // Custom adapter takes precedence
    if (libraryContent && contentAdapter) {
      return contentAdapter(libraryContent);
    }

    // Full format
    if (content) {
      return content;
    }

    // Simplified format
    if (simpleContent) {
      return expandToFullStructure(simpleContent);
    }

    // Try to auto-detect format
    if (libraryContent) {
      return autoDetectAndAdapt(libraryContent);
    }

    return [];
  }, [content, simpleContent, libraryContent, contentAdapter]);

  // ... rest of component
};
```

---

## For External Library Developers: Integration Best Practices

### Making Your Library WTF-Compatible

#### 1. Provide a Standard Export Format

```typescript
// Your library's export interface
export interface YourLibraryExport {
  // Essential fields (match common patterns)
  categories: {
    id: string;              // Unique identifier
    name: string;            // Display name
    order?: number;          // Optional sort order

    items: {
      id: string;            // Unique identifier
      url: string;           // Content URL
      thumbnail: string;     // Preview image
      title?: string;        // Optional title
      metadata?: {           // Flexible metadata
        [key: string]: any;
      };
    }[];
  }[];
}
```

**Why This Works:**
- ✅ Minimal required fields (id, name, url, thumbnail)
- ✅ Optional fields for enhanced functionality
- ✅ Flexible metadata for custom data
- ✅ Easy to map to WTF structure

#### 2. Include a WTF Adapter in Your Library

```typescript
// Include this in your library
export function toWTFFormat(data: YourLibraryExport) {
  return {
    content: data.categories.map((cat, catIndex) => ({
      id: cat.id,
      title: cat.name,
      weight: cat.order ?? catIndex,
      episode_id: 'default',
      description: cat.metadata?.description || '',
      content_block_items: cat.items.map((item, itemIndex) => ({
        id: item.id,
        note: item.title || '',
        weight: itemIndex,
        content_block_id: cat.id,
        news_id: item.id,
        content: {
          id: item.id,
          version: 1,
          content_type: detectType(item.url),
          content_url: item.url,
          content_id: extractId(item.url),
          content_created_at: item.metadata?.createdAt || new Date().toISOString(),
          thumbnail_url: item.thumbnail,
          submitted_by: item.metadata?.author || 'library',
          submitted_at: new Date().toISOString(),
          category: cat.name,
          categories: item.metadata?.tags || [],
          description: item.metadata?.description || ''
        }
      }))
    }))
  };
}

// Usage example for your library users
import { YourLibrary } from 'your-library';
import WTF from '@/wtf/WTF';

const libraryData = YourLibrary.getData();
const wtfData = YourLibrary.toWTFFormat(libraryData);

<WTF content={wtfData.content} />
```

#### 3. Document Integration Patterns

Include in your library's README:

````markdown
## Integration with WTF 3D Viewer

This library provides native support for the WTF 3D content viewer.

### Quick Start

```typescript
import { YourLibrary } from 'your-library';
import WTF from '@/wtf/WTF';

// Fetch your data
const data = await YourLibrary.fetchContent();

// Convert to WTF format
const wtfContent = YourLibrary.toWTFFormat(data);

// Render
<WTF content={wtfContent.content} />
```

### Custom Mapping

If you need custom field mapping:

```typescript
const wtfContent = YourLibrary.toWTFFormat(data, {
  categoryTitle: 'custom_name_field',
  itemThumbnail: 'preview_url',
  // ... other mappings
});
```
````

#### 4. Provide TypeScript Definitions

```typescript
// your-library.d.ts

export interface WTFIntegration {
  // Export the types WTF needs
  LiveViewContentBlock: Array<{
    id: string;
    title: string;
    weight: number;
    episode_id: string;
    description: string;
    content_block_items: Array<{
      id: string;
      note: string;
      weight: number;
      content_block_id: string;
      news_id: string;
      content: {
        id: string;
        version: number;
        content_type: 'video' | 'twitter' | 'image' | 'website';
        content_url: string;
        content_id: string;
        content_created_at: string;
        thumbnail_url: string;
        submitted_by: string;
        submitted_at: string;
        category: string;
        categories: string[];
        description: string;
      };
    }>;
  }>;
}

export function toWTFFormat(data: YourData): WTFIntegration;
```

#### 5. Support Incremental Loading

```typescript
// Allow paginated/streaming data
export interface YourLibraryStreamingExport {
  getNextPage(): Promise<YourLibraryExport>;
  hasMore(): boolean;

  // Convert each page to WTF format
  toWTFFormat(): ReturnType<typeof toWTFFormat>;
}

// Usage
const stream = YourLibrary.createStream();
let allContent = [];

while (stream.hasMore()) {
  const page = await stream.getNextPage();
  const wtfPage = YourLibrary.toWTFFormat(page);
  allContent = [...allContent, ...wtfPage.content];
}

<WTF content={allContent} />
```

---

## Recommended Integration Workflow

### Step 1: Initial Integration

1. **Library Developer** provides standard export format
2. **Library Developer** includes `toWTFFormat()` adapter
3. **WTF User** imports both library and WTF
4. **WTF User** converts data and passes to WTF component

### Step 2: Testing & Validation

```typescript
// Test your integration
import { validateAndSuggest } from '@/wtf/utils/validation';

const libraryData = YourLibrary.getData();
const wtfData = YourLibrary.toWTFFormat(libraryData);

const validation = validateAndSuggest(wtfData.content);

if (!validation.valid) {
  console.error('Integration issues:', validation.errors);
  console.info('Suggestions:', validation.suggestions);
}
```

### Step 3: Optimization

```typescript
// Cache transformed data
const cachedAdapter = memoize((libraryData) =>
  YourLibrary.toWTFFormat(libraryData)
);

const wtfData = cachedAdapter(libraryData);
```

---

## Common Integration Patterns

### Pattern 1: REST API Library

```typescript
// Your library fetches from REST API
export class ContentLibrary {
  async fetchContent(): Promise<YourLibraryExport> {
    const response = await fetch('/api/content');
    return response.json();
  }

  static toWTFFormat(data: YourLibraryExport) {
    // Transform to WTF format
  }
}

// User integration
const data = await ContentLibrary.fetchContent();
const wtfData = ContentLibrary.toWTFFormat(data);
<WTF content={wtfData.content} />
```

### Pattern 2: CMS Library

```typescript
// Your library connects to CMS
export class CMSLibrary {
  constructor(apiKey: string) {
    this.client = new CMSClient(apiKey);
  }

  async getCategories() {
    return this.client.fetch('categories');
  }

  toWTFFormat() {
    // Built-in transformation
  }
}

// User integration
const cms = new CMSLibrary(API_KEY);
const wtfData = await cms.toWTFFormat();
<WTF content={wtfData} />
```

### Pattern 3: Static Content Library

```typescript
// Your library provides static content bundles
export const ContentBundles = {
  demos: {
    categories: [...],
    toWTFFormat() {
      return transformToWTF(this.categories);
    }
  },

  tutorials: {
    categories: [...],
    toWTFFormat() {
      return transformToWTF(this.categories);
    }
  }
};

// User integration
<WTF content={ContentBundles.demos.toWTFFormat()} />
```

---

## Checklist for Library Developers

### Essential Features

- [ ] Export data in standard format (categories → items → content)
- [ ] Provide `toWTFFormat()` adapter function
- [ ] Include TypeScript definitions
- [ ] Document WTF integration in README
- [ ] Provide minimal example code

### Recommended Features

- [ ] Support custom field mapping
- [ ] Provide validation helpers
- [ ] Support incremental/paginated loading
- [ ] Include error handling and recovery
- [ ] Provide transformation caching

### Advanced Features

- [ ] Real-time updates (WebSocket/SSE)
- [ ] Content prefetching
- [ ] Thumbnail generation/optimization
- [ ] Content type auto-detection
- [ ] Metadata extraction

---

## Example: Complete Integration

```typescript
// external-library.ts (Your Library)
export interface LibraryContent {
  sections: {
    id: string;
    name: string;
    media: {
      id: string;
      videoUrl: string;
      imageUrl: string;
      caption: string;
    }[];
  }[];
}

export class ContentLibrary {
  async fetch(): Promise<LibraryContent> {
    // Your fetch logic
  }

  static toWTFFormat(data: LibraryContent) {
    return data.sections.map((section, index) => ({
      id: section.id,
      title: section.name,
      weight: index,
      episode_id: 'library-content',
      description: '',
      content_block_items: section.media.map((item, itemIndex) => ({
        id: item.id,
        note: item.caption,
        weight: itemIndex,
        content_block_id: section.id,
        news_id: item.id,
        content: {
          id: item.id,
          version: 1,
          content_type: 'video',
          content_url: item.videoUrl,
          content_id: extractVideoId(item.videoUrl),
          content_created_at: new Date().toISOString(),
          thumbnail_url: item.imageUrl,
          submitted_by: 'content-library',
          submitted_at: new Date().toISOString(),
          category: section.name,
          categories: [],
          description: item.caption
        }
      }))
    }));
  }
}

// app.tsx (User Integration)
import { ContentLibrary } from 'external-library';
import WTF from '@/wtf/WTF';

export default function App() {
  const [content, setContent] = useState([]);

  useEffect(() => {
    ContentLibrary.fetch()
      .then(data => ContentLibrary.toWTFFormat(data))
      .then(wtfData => setContent(wtfData));
  }, []);

  return <WTF content={content} />;
}
```

---

## Summary

### For WTF Developers:

1. **Create adapter functions** for common library patterns
2. **Simplify required fields** with a `SimplifiedContent` interface
3. **Add validation helpers** with clear error messages
4. **Support multiple input formats** with auto-detection

### For Library Developers:

1. **Provide standard export format** with minimal required fields
2. **Include `toWTFFormat()` adapter** in your library
3. **Document integration patterns** with examples
4. **Export TypeScript definitions** for type safety
5. **Support common use cases** (pagination, real-time, etc.)

### Win-Win Integration:

- **Library** provides data in a consistent format
- **Adapter** handles transformation
- **WTF** receives properly formatted data
- **Users** write minimal glue code

---

*Last Updated: October 11, 2025*
*Version: 2.0 - Props-based API with external library support*
