# Core - Shared Abstractions

## Purpose

The **core** directory contains shared abstractions, utilities, and state management that are used throughout the viewer system. This is the foundation layer that other components depend on.

## Directory Structure

```
core/
├── content/          # Content type system (OOP architecture)
├── store/           # State management (Zustand stores)
└── transforms/      # Layout calculation utilities
```

## Important Files

### content/ - Content Type System

**Why it exists:** Provides a unified, type-safe way to handle different content types (YouTube, Twitter, websites, etc.) through object-oriented inheritance.

**Key files:**
- **`BaseContent.ts`** - Abstract base class that all content types extend
- **`ContentFactory.ts`** - Factory function to create appropriate content instances
- **`TweetContent.ts`** - Twitter/X content handler
- **`VideoContent.ts`** - YouTube/Vimeo video handler
- **`WebsiteContent.ts`** - Generic website link handler
- **`DiscordContent.ts`** - Discord message handler
- **`WarpcastContent.ts`** - Farcaster/Warpcast post handler
- **`ImageContent.ts`** - Image content handler
- **`types.ts`** - TypeScript interfaces and enums
- **`index.ts`** - Public API exports

**Usage:**
```typescript
import { createContentInstance } from '@/viewer/core/content'

// Create instance based on content type
const content = createContentInstance(contentData)

// Get platform-specific display info
const displayInfo = content.getDisplayInfo()

// Get metadata
const metadata = content.getMetadata()

// Type-specific features
if (content instanceof TweetContent) {
  const embedUrl = content.getEmbedUrl()
}
```

### store/ - State Management

**Why it exists:** Centralized state management for content data, navigation, and video controls.

**Key files:**
- **`contentStore.tsx`** - Main Zustand store for content
  - Fetches data from Supabase
  - Manages active category and item
  - Navigation methods (setNextColumn, setPrevColumn, etc.)
  - Video playback controls

**Usage:**
```typescript
import { useContentStore } from '@/viewer/core/store/contentStore'

function MyComponent() {
  const {
    contents,
    activeCategoryId,
    setNextColumn
  } = useContentStore()

  return <button onClick={setNextColumn}>Next →</button>
}
```

### transforms/ - Layout Calculations

**Why it exists:** Utilities for calculating 3D positions and transformations for different display layouts.

**Status:** Currently minimal - future home for extracted transform logic.

## Design Principles

### 1. Abstraction Over Implementation

Core provides abstractions (BaseContent) rather than concrete implementations. This allows components to work with any content type without knowing specifics.

### 2. Single Source of Truth

State management is centralized in stores. Components subscribe to state rather than maintaining their own copies.

### 3. Type Safety

Heavy use of TypeScript interfaces and enums to catch errors at compile time.

### 4. Extensibility

New content types can be added by:
1. Creating a new class extending `BaseContent`
2. Adding a case to `ContentFactory`
3. No changes needed to existing code

## Content Type System Architecture

```
┌─────────────────────────────────┐
│        BaseContent              │
│  (Abstract base class)          │
│                                 │
│  + getType(): ContentType       │
│  + getUrl(): string             │
│  + getMetadata(): object        │
│  + getDisplayInfo(): object     │
│  + fetchAdditionalData(): bool  │
└─────────────────────────────────┘
                 △
                 │
    ┌────────────┴────────────┬─────────────┬──────────────┐
    │            │            │             │              │
┌───────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐  ┌─────────┐
│ Tweet │  │  Video   │  │ Website │  │ Discord  │  │  Image  │
└───────┘  └──────────┘  └─────────┘  └──────────┘  └─────────┘
```

## Adding a New Content Type

1. **Create the class:**
```typescript
// core/content/NewTypeContent.ts
import { BaseContent } from './BaseContent'
import { ContentType, LiveViewContent } from './types'

export class NewTypeContent extends BaseContent {
  getType(): ContentType {
    return ContentType.NEWTYPE
  }

  getDisplayInfo() {
    return {
      platformIcon: '🆕',
      platformName: 'New Platform',
      // ... other platform-specific info
    }
  }
}
```

2. **Update the factory:**
```typescript
// core/content/ContentFactory.ts
case ContentType.NEWTYPE:
  return new NewTypeContent(data)
```

3. **Export it:**
```typescript
// core/content/index.ts
export { NewTypeContent } from './NewTypeContent'
```

4. **Create a template** (in `pillar/templates/`)

## State Management Patterns

### Selective Subscription

Only subscribe to the state you need:

```typescript
// ❌ Bad - re-renders on any state change
const store = useContentStore()

// ✅ Good - only re-renders when activeCategoryId changes
const activeCategoryId = useContentStore(s => s.activeCategoryId)
```

### Actions vs Direct Mutation

Always use store actions:

```typescript
// ❌ Bad - direct mutation
useContentStore.setState({ activeCategoryId: 'new-id' })

// ✅ Good - use action
const setActiveCategory = useContentStore(s => s.setActiveCategory)
setActiveCategory('new-id')
```

## Dependencies

- **Zustand** - State management
- **TypeScript** - Type safety
- **Supabase** - Data fetching

## Related Documentation

- `/viewer/ARCHITECTURE.md` - Overall system architecture
- `/viewer/pillar/README.md` - How content is displayed
- `/viewer/scene/README.md` - 3D environment details
