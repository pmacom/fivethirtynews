# WTF Data Types - Complete Reference

## Overview

This document provides a comprehensive guide to all data types, interfaces, and data structures used throughout the WTF 3D content viewer ecosystem. Understanding these types is critical for integrating content, extending functionality, and maintaining data consistency.

---

## Table of Contents

1. [Content Data Types](#content-data-types)
2. [Store State Types](#store-state-types)
3. [Component Prop Types](#component-prop-types)
4. [Enum Types](#enum-types)
5. [Minimal Requirements](#minimal-requirements)
6. [Optional Fields](#optional-fields)
7. [Data Flow Diagram](#data-flow-diagram)
8. [Validation Rules](#validation-rules)

---

## Content Data Types

### LiveViewContentBlock

**Purpose**: The primary data structure for WTF content. Represents a category/column of content in the 3D pillar display.

**Location**: `Content/types.ts`

**Required by**: `WTFProps.content`, `ContentStore`

```typescript
interface LiveViewContentBlock {
  // REQUIRED FIELDS
  id: string                                    // Unique identifier for this category
  title: string                                 // Display name shown in Legend
  weight: number                                // Sort order (0 = first, ascending)
  episode_id: string                            // Parent episode identifier
  description: string                           // Category description

  // REQUIRED NESTED ARRAY
  content_block_items: LiveViewContentBlockItems[]  // Array of items in this category
}
```

**Field Details**:

- **`id`** (required)
  - **Type**: `string`
  - **Purpose**: Unique identifier for navigation and state management
  - **Used in**: ContentStore for tracking activeCategory, URL routing
  - **Example**: `"tech-news-001"`, `"ai-updates-2024"`
  - **Validation**: Must be unique across all categories in the array

- **`title`** (required)
  - **Type**: `string`
  - **Purpose**: Human-readable category name displayed in the Legend sidebar
  - **Example**: `"Tech News"`, `"AI Updates"`, `"Design Inspiration"`
  - **Display Location**: Legend sidebar (left side of UI)

- **`weight`** (required)
  - **Type**: `number`
  - **Purpose**: Controls display order in the 3D pillar (lower = displayed first)
  - **Example**: `0`, `1`, `2`, `10`, `100`
  - **Sorting**: Ascending order (0, 1, 2...)
  - **Note**: Can have gaps (0, 10, 20 is valid)

- **`episode_id`** (required)
  - **Type**: `string`
  - **Purpose**: Links category to parent episode (useful for multi-episode systems)
  - **Example**: `"episode-2024-10-11"`
  - **Note**: All categories in one WTF instance typically share the same episode_id

- **`description`** (required)
  - **Type**: `string`
  - **Purpose**: Longer description of category content
  - **Display**: May be shown in Details panel
  - **Example**: `"Latest technology news and updates from the week"`

- **`content_block_items`** (required)
  - **Type**: `LiveViewContentBlockItems[]`
  - **Purpose**: Array of individual content items within this category
  - **Minimum Length**: 1 (must have at least one item)
  - **Details**: See [LiveViewContentBlockItems](#liveviewcontentblockitems)

---

### LiveViewContentBlockItems

**Purpose**: Represents an individual piece of content (video, tweet, image, etc.) within a category.

**Location**: `Content/types.ts`

**Required by**: `LiveViewContentBlock.content_block_items`

```typescript
interface LiveViewContentBlockItems {
  // REQUIRED FIELDS
  id: string                    // Unique identifier for this item
  note: string                  // Description/note about this content
  weight: number                // Sort order within category
  content_block_id: string      // Parent category ID
  news_id: string               // Original news/content source ID
  content: LiveViewContent      // The actual media content
}
```

**Field Details**:

- **`id`** (required)
  - **Type**: `string`
  - **Purpose**: Unique identifier for this specific content item
  - **Used in**: ContentStore for tracking activeItem, navigation
  - **Example**: `"item-001"`, `"video-yt-abc123"`

- **`note`** (required)
  - **Type**: `string`
  - **Purpose**: Commentary, description, or context about this content
  - **Display**: Shown in Details panel, Legend items list
  - **Example**: `"Great explanation of React hooks"`, `"Funny meme about TypeScript"`
  - **Can be empty**: `""` (but field must exist)

- **`weight`** (required)
  - **Type**: `number`
  - **Purpose**: Controls display order within the category (lower = first)
  - **Example**: `0`, `1`, `2`, `10`
  - **Sorting**: Ascending within category

- **`content_block_id`** (required)
  - **Type**: `string`
  - **Purpose**: References parent `LiveViewContentBlock.id`
  - **Validation**: Must match an existing category ID
  - **Example**: If parent is `"tech-news-001"`, this should be `"tech-news-001"`

- **`news_id`** (required)
  - **Type**: `string`
  - **Purpose**: Original source identifier (from news aggregator, CMS, etc.)
  - **Example**: `"news-item-xyz"`, `"supabase-row-123"`
  - **Note**: Used for tracking original source, not for WTF navigation

- **`content`** (required)
  - **Type**: `LiveViewContent`
  - **Purpose**: The actual media object (video, image, tweet, etc.)
  - **Details**: See [LiveViewContent](#liveviewcontent)

---

### LiveViewContent

**Purpose**: The actual media object - contains URLs, metadata, and content type information.

**Location**: `Content/types.ts`

**Required by**: `LiveViewContentBlockItems.content`

```typescript
interface LiveViewContent {
  // REQUIRED FIELDS
  id: string                    // Unique content identifier
  version: number               // Content version number
  content_type: ContentType     // Type enum (video, twitter, image, etc.)
  content_url: string           // Primary content URL
  content_id: string            // Platform-specific ID (YouTube ID, Tweet ID, etc.)
  content_created_at: string    // Original creation timestamp
  thumbnail_url: string         // Preview image URL
  submitted_by: string          // Who added this content
  submitted_at: string          // When it was added to system
  category: string              // Primary category/topic
  categories: string[]          // Additional categories/tags
  description: string           // Content description
}
```

**Field Details**:

- **`id`** (required)
  - **Type**: `string`
  - **Purpose**: Unique identifier for this specific media object
  - **Example**: `"content-abc-123"`

- **`version`** (required)
  - **Type**: `number`
  - **Purpose**: Content versioning (for updates/edits)
  - **Example**: `1`, `2`, `3`
  - **Default**: Usually `1` for new content

- **`content_type`** (required)
  - **Type**: `ContentType` enum
  - **Purpose**: Determines how content is rendered in Pillar
  - **Values**: `'video'`, `'twitter'`, `'warpcast'`, `'website'`, `'discord'`, `'image'`
  - **Example**: `ContentType.VIDEO`, `ContentType.TWITTER`
  - **Rendering**: Different templates based on type (see `Pillar/templates/`)

- **`content_url`** (required)
  - **Type**: `string`
  - **Purpose**: Primary URL to the content
  - **Examples**:
    - YouTube: `"https://youtube.com/watch?v=abc123"`
    - Twitter: `"https://twitter.com/user/status/123"`
    - Image: `"https://example.com/image.jpg"`
    - Website: `"https://example.com/article"`
  - **Usage**: Extracted for embedding (YouTube ID, Tweet ID, etc.)

- **`content_id`** (required)
  - **Type**: `string`
  - **Purpose**: Platform-specific identifier
  - **Examples**:
    - YouTube: `"abc123"` (video ID)
    - Twitter: `"1234567890"` (tweet ID)
    - Image: `"image-filename.jpg"`
  - **Extraction**: Often extracted from `content_url` via utils

- **`content_created_at`** (required)
  - **Type**: `string` (ISO 8601 timestamp)
  - **Purpose**: When content was originally created on platform
  - **Example**: `"2024-10-11T12:00:00Z"`
  - **Format**: ISO 8601 string

- **`thumbnail_url`** (required)
  - **Type**: `string`
  - **Purpose**: Preview image shown in 3D pillar before interaction
  - **Example**: `"https://img.youtube.com/vi/abc123/maxresdefault.jpg"`
  - **Display**: Rendered as texture on 3D plane
  - **Processing**: May be transformed via `WTF_CONFIG.useRelativeImagePaths`

- **`submitted_by`** (required)
  - **Type**: `string`
  - **Purpose**: User/system that added this content
  - **Example**: `"user@example.com"`, `"admin"`, `"import-script"`

- **`submitted_at`** (required)
  - **Type**: `string` (ISO 8601 timestamp)
  - **Purpose**: When content was added to WTF system
  - **Example**: `"2024-10-11T14:30:00Z"`

- **`category`** (required)
  - **Type**: `string`
  - **Purpose**: Primary category/topic classification
  - **Example**: `"technology"`, `"design"`, `"AI"`
  - **Note**: Single primary category (use `categories` for multiple)

- **`categories`** (required)
  - **Type**: `string[]`
  - **Purpose**: Multiple category/tag assignments
  - **Example**: `["AI", "machine-learning", "tutorials"]`
  - **Can be empty**: `[]` (but field must exist)

- **`description`** (required)
  - **Type**: `string`
  - **Purpose**: Content description/summary
  - **Example**: `"Tutorial on React Three Fiber basics"`
  - **Display**: Shown in Details panel
  - **Can be empty**: `""` (but field must exist)

---

## Store State Types

### ContentStoreState

**Purpose**: Internal state for content navigation and display.

**Location**: `Content/contentStore.ts`

**Managed by**: ContentStore (Zustand-x)

```typescript
interface ContentStoreState {
  // Episode Context
  episodeId: string | null                          // Current episode ID

  // Navigation State
  isAnimating: boolean                              // True during pillar rotation
  activeCategoryId: string                          // Current category ID
  activeItemId: string                              // Current item ID
  activeCategoryIndex: number                       // Current category index (0-based)
  activeItemIndex: number                           // Current item index within category (0-based)

  // Computed Arrays (for navigation)
  categoryIds: string[]                             // All category IDs in order
  categoryTitles: string[]                          // All category titles in order
  itemIds: string[][]                               // 2D array: [categoryIndex][itemIndex] = itemId
  itemTitles: string[][]                            // 2D array: [categoryIndex][itemIndex] = itemTitle

  // Active Item Data
  activeItemObject: Group | null                    // Three.js Group reference for camera
  activeItemData: LiveViewContentBlockItems | null  // Full data of active item

  // Video Playback State
  isContentVideo: boolean                           // True if active content is video
  isVideoSeeking: boolean                           // True during video scrubbing
  videoSeekTime: number                             // Video seek position in seconds

  // Content Data
  content: LiveViewContentBlock[]                   // All content data (from props)
  maxIndex: number | null                           // Total number of navigable items

  // Slide Navigation (alternative navigation mode)
  activeSlideIndex: number                          // Flat index across all content
  focusedSlideIndex: number                         // Currently focused slide
}
```

**Key Field Purposes**:

- **Navigation Tracking**:
  - `activeCategoryId` / `activeCategoryIndex` - Current category
  - `activeItemId` / `activeItemIndex` - Current item within category
  - These sync to maintain consistency during navigation

- **Computed Arrays**:
  - `categoryIds` - Quick lookup: `categoryIds[2]` = ID of 3rd category
  - `itemIds` - Quick lookup: `itemIds[2][1]` = ID of 2nd item in 3rd category
  - Generated automatically when content is set

- **Animation State**:
  - `isAnimating` - Prevents navigation during pillar rotation
  - Camera waits for animation complete before fitting

- **3D Integration**:
  - `activeItemObject` - Three.js mesh/group for camera focus
  - Used by SceneStore for `fitToBox()` camera animation

---

### AudioStoreState

**Purpose**: Audio analysis state for audio-reactive features.

**Location**: `Audio/audioStore.tsx`

**Managed by**: AudioStore (Zustand-x)

**Plugin**: Optional (only when `enableAudio={true}`)

```typescript
interface AudioStoreState {
  // Device Configuration
  deviceId: string                    // Selected audio device ID
  audioDevices: MediaDeviceInfo[]     // Available audio devices
  selectedDeviceId: string | null     // Currently selected device
  connectionStatus: AudioConnectionStatus  // Connection state enum

  // Web Audio API Objects
  isAudioStreamSetup: boolean         // True if audio initialized
  audioContext: AudioContext | null   // Web Audio API context
  analyserNode: AnalyserNode | null   // Audio analysis node
  audioStream: MediaStream | null     // Active audio stream

  // Stream State
  isStreamActive: boolean             // True if stream running
  isAnalyserReady: boolean            // True if ready for analysis

  // Frequency Analysis Data
  frequencyData: Float32Array         // Raw frequency data (FFT output)
  low: number                         // Normalized low frequencies (0-1)
  mid: number                         // Normalized mid frequencies (0-1)
  high: number                        // Normalized high frequencies (0-1)
  amplitude: number                   // Overall volume (0-2+)
  rawAmplitude: number                // Raw amplitude before adjustment

  // Gain Controls
  lowGain: number                     // Low frequency gain multiplier (default: 1.6)
  midGain: number                     // Mid frequency gain multiplier (default: 1.6)
  highGain: number                    // High frequency gain multiplier (default: 3)
}
```

**Key Field Purposes**:

- **Audio Analysis Output** (use these in custom 3D models):
  - `low` - Bass frequencies (0-250 Hz) normalized to 0-1
  - `mid` - Mid frequencies (250-4000 Hz) normalized to 0-1
  - `high` - High frequencies (4000+ Hz) normalized to 0-1
  - `amplitude` - Overall volume, useful for scale animations

- **Configuration**:
  - `deviceId` - Which microphone/audio output to analyze
  - `audioDevices` - List of available devices for user selection

- **Internal State** (managed automatically):
  - `audioContext`, `analyserNode`, `audioStream` - Web Audio API objects
  - `frequencyData` - Raw FFT data (processed to low/mid/high)

---

### SceneStoreState

**Purpose**: 3D scene and camera state.

**Location**: `Scene/sceneStore.ts`

**Managed by**: SceneStore (Zustand-x)

```typescript
interface SceneStoreState {
  camera: CameraControls | null   // React Three Drei camera controls
  canvasWidth: number              // Canvas viewport width in pixels
  canvasHeight: number             // Canvas viewport height in pixels
}
```

**Key Field Purposes**:

- **Camera Reference**:
  - `camera` - React Three Drei CameraControls instance
  - Used for programmatic camera movement (fitToBox, etc.)

- **Viewport Dimensions**:
  - `canvasWidth` / `canvasHeight` - Updated on window resize
  - Used for aspect ratio calculations and responsive 3D layout

---

### SettingsStoreState

**Purpose**: Application settings and UI state.

**Location**: `Settings/settingsStore.ts`

**Managed by**: SettingStore (Zustand-x)

**Persisted**: Yes (localStorage)

```typescript
interface SettingsStoreState {
  // Audio Settings
  isTrackingAudio: boolean              // Enable audio tracking
  isPlayingContentAudio: boolean        // Play content audio
  isAudioReactivityEnabled: boolean     // Enable audio reactivity

  // Device Detection
  isMobile: boolean                     // True on mobile devices
  isTablet: boolean                     // True on tablets
  isDesktop: boolean                    // True on desktop

  // View Settings
  isFreeLook: boolean                   // Enable free camera movement
  isShowStats: boolean                  // Show performance stats

  // UI Panel Visibility
  showAudioSettings: boolean            // Show audio settings panel
  showSettings: boolean                 // Show main settings panel
  showLeva: boolean                     // Show Leva dev controls

  // Input Methods
  useKeyboard: boolean                  // Enable keyboard navigation
}
```

**Key Field Purposes**:

- **Persisted Settings**:
  - All settings saved to localStorage automatically
  - Restored on page reload

- **Device Detection**:
  - `isMobile` / `isTablet` / `isDesktop` - Set on initialization
  - Used for responsive UI and interaction adjustments

- **UI Control**:
  - `showSettings` / `showAudioSettings` / `showLeva` - Toggle panels
  - `useKeyboard` - Enable/disable arrow key navigation

---

## Component Prop Types

### WTFProps

**Purpose**: Main props interface for the WTF component.

**Location**: `types.ts`

**Used by**: `WTF.tsx`

```typescript
interface WTFProps {
  // REQUIRED
  content: LiveViewContentBlock[];         // Content data array

  // OPTIONAL: Initial State
  initialCategoryId?: string;              // Start at specific category
  initialItemId?: string;                  // Start at specific item

  // OPTIONAL: Callbacks
  onCategoryChange?: (categoryId: string, categoryIndex: number) => void;
  onItemChange?: (itemId: string, itemIndex: number, itemData: LiveViewContentBlockItems) => void;
  onItemClick?: (itemData: LiveViewContentBlockItems) => void;

  // OPTIONAL: UI Customization
  showLegend?: boolean;                    // Show Legend sidebar (default: true)
  showDetails?: boolean;                   // Show Details panel (default: true)
  children?: React.ReactNode;              // Custom 3D models

  // OPTIONAL: Plugins
  enableAudio?: boolean;                   // Enable audio plugin (default: false)
  enableDevControls?: boolean;             // Enable dev controls (default: false)
  enableKeyboard?: boolean;                // Enable keyboard nav (default: true)
  enableSwipe?: boolean;                   // Enable swipe nav (default: true)

  // OPTIONAL: Styling
  className?: string;                      // CSS class for wrapper div
}
```

---

## Enum Types

### ContentType

**Purpose**: Classifies media content type for rendering.

**Location**: `Content/types.ts`

**Used in**: `LiveViewContent.content_type`

```typescript
enum ContentType {
  VIDEO = 'video',        // YouTube, Vimeo, etc.
  TWITTER = 'twitter',    // Twitter/X tweets
  WARPCAST = 'warpcast',  // Farcaster/Warpcast casts
  WEBSITE = 'website',    // General websites/articles
  DISCORD = 'discord',    // Discord messages/embeds
  IMAGE = 'image'         // Static images
}
```

**Rendering**:
- Each type may use different template in `Pillar/templates/`
- `TWITTER` uses `Tweet.tsx` template
- Others use `Default.tsx` template

---

### TopicType

**Purpose**: Content categorization/tagging.

**Location**: `Content/types.ts`

**Used in**: Content filtering, category assignment

```typescript
enum TopicType {
  ART = 'art',
  LLM = 'llm',
  CODE = 'code',
  ROBOTICS = 'robotics',
  NONSENSE = 'nonsense',
  SENSE = 'sense',
  SOCIETY = 'society',
  MEDICINE = 'medicine',
  CRYPTO = 'crypto',
  VIRTUAL = 'virtual',
  ENERGY = 'energy',
  AUDIO = 'audio',
  LAW = 'law',
  UX = 'ux',
  SECURITY = 'security',
  COMFYUI = 'comfyui',
  ANIMATION = 'animation',
  DESIGN = 'design'
}
```

---

## Minimal Requirements

### Absolute Minimum WTF Content

The smallest valid content structure for WTF:

```typescript
const minimalContent: LiveViewContentBlock[] = [
  {
    // Category
    id: "cat-1",
    title: "Category 1",
    weight: 0,
    episode_id: "ep-1",
    description: "First category",
    content_block_items: [
      {
        // Item
        id: "item-1",
        note: "First item",
        weight: 0,
        content_block_id: "cat-1",
        news_id: "news-1",
        content: {
          // Content
          id: "content-1",
          version: 1,
          content_type: "video",
          content_url: "https://youtube.com/watch?v=abc123",
          content_id: "abc123",
          content_created_at: "2024-10-11T00:00:00Z",
          thumbnail_url: "https://img.youtube.com/vi/abc123/maxresdefault.jpg",
          submitted_by: "system",
          submitted_at: "2024-10-11T00:00:00Z",
          category: "uncategorized",
          categories: [],
          description: ""
        }
      }
    ]
  }
];
```

**This will render**:
- 1 category in the pillar
- 1 item in that category
- 1 video thumbnail
- Legend with 1 category
- Details panel with item info

---

## Optional Fields

### Fields That Can Be Empty Strings

These fields are required to exist, but can be empty:

- `LiveViewContentBlockItems.note` - Can be `""`
- `LiveViewContent.description` - Can be `""`
- `LiveViewContent.category` - Technically required, but can be `"uncategorized"`
- `LiveViewContent.categories` - Can be `[]`

### Fields That Can Be Null

- `ContentStoreState.episodeId` - Can be `null` if not using episodes
- `ContentStoreState.activeItemObject` - `null` until item rendered
- `ContentStoreState.activeItemData` - `null` until item selected
- `ContentStoreState.maxIndex` - `null` before content loaded
- `AudioStoreState.selectedDeviceId` - `null` before selection
- `AudioStoreState.audioContext` - `null` before setup
- `AudioStoreState.analyserNode` - `null` before setup
- `AudioStoreState.audioStream` - `null` before setup
- `SceneStoreState.camera` - `null` before scene initialized

---

## Data Flow Diagram

```
User/API
  │
  ├─> Fetch Content Data
  │     │
  │     └─> LiveViewContentBlock[] (from Supabase, REST, GraphQL, etc.)
  │
  ├─> Pass to WTF Component
  │     │
  │     └─> <WTF content={data} />
  │
  ├─> WTF Initializes ContentStore
  │     │
  │     ├─> ContentStore.set.setContent(content)
  │     │     └─> Processes data, builds indices
  │     │
  │     └─> ContentStore.set.setInitialActive(categoryId, itemId)
  │           └─> Sets active category/item
  │
  ├─> Pillar Reads from ContentStore
  │     │
  │     ├─> ContentStore.use.content()
  │     ├─> ContentStore.use.activeCategoryId()
  │     └─> ContentStore.use.activeItemIndex()
  │
  ├─> User Navigates (keyboard/swipe)
  │     │
  │     └─> BehaviorDetection triggers
  │           │
  │           ├─> ContentStore.set.setNextColumn()
  │           ├─> ContentStore.set.setPrevColumn()
  │           ├─> ContentStore.set.setNextItem()
  │           └─> ContentStore.set.setPrevItem()
  │
  └─> WTF Fires Callbacks
        │
        ├─> onCategoryChange(id, index)
        └─> onItemChange(id, index, data)
```

---

## Validation Rules

### Content Structure Validation

```typescript
// Validate content array
function validateContent(content: LiveViewContentBlock[]): boolean {
  // Must have at least one category
  if (!content || content.length === 0) {
    console.error('Content array is empty');
    return false;
  }

  for (const block of content) {
    // Each category must have required fields
    if (!block.id || !block.title || typeof block.weight !== 'number') {
      console.error('Invalid category:', block);
      return false;
    }

    // Each category must have at least one item
    if (!block.content_block_items || block.content_block_items.length === 0) {
      console.error('Category has no items:', block.id);
      return false;
    }

    for (const item of block.content_block_items) {
      // Each item must have required fields
      if (!item.id || !item.content) {
        console.error('Invalid item:', item);
        return false;
      }

      // Each content must have required fields
      if (!item.content.content_url || !item.content.thumbnail_url) {
        console.error('Invalid content:', item.content);
        return false;
      }
    }
  }

  return true;
}
```

### Weight Validation

```typescript
// Weights should be unique and ascending
function validateWeights(items: { weight: number }[]): boolean {
  const weights = items.map(i => i.weight);
  const sorted = [...weights].sort((a, b) => a - b);

  // Check if already sorted
  const isSorted = weights.every((w, i) => w === sorted[i]);

  if (!isSorted) {
    console.warn('Weights are not in ascending order, will be sorted');
  }

  // Check for duplicates
  const unique = new Set(weights);
  if (unique.size !== weights.length) {
    console.warn('Duplicate weights found, may cause unpredictable ordering');
  }

  return true;
}
```

### URL Validation

```typescript
// Validate URLs are properly formatted
function validateUrls(content: LiveViewContent): boolean {
  try {
    new URL(content.content_url);
    new URL(content.thumbnail_url);
    return true;
  } catch {
    console.error('Invalid URL in content:', content.id);
    return false;
  }
}
```

---

## Common Data Patterns

### Pattern 1: Supabase Content Fetch

```typescript
// Fetch from Supabase with proper structure
const { data, error } = await supabase
  .from('content_blocks')
  .select(`
    *,
    content_block_items (
      *,
      content (*)
    )
  `)
  .eq('episode_id', episodeId)
  .order('weight', { ascending: true });

// Data is already in LiveViewContentBlock[] format
// Just need to sort items by weight
const sortedData: LiveViewContentBlock[] = data.map(block => ({
  ...block,
  content_block_items: block.content_block_items
    .filter(item => item !== undefined)
    .sort((a, b) => a.weight - b.weight)
}));
```

### Pattern 2: REST API Transformation

```typescript
// Transform REST API response to WTF format
interface APIResponse {
  categories: {
    name: string;
    items: {
      title: string;
      videoUrl: string;
      thumbnailUrl: string;
    }[];
  }[];
}

function transformToWTFContent(api: APIResponse): LiveViewContentBlock[] {
  return api.categories.map((cat, catIndex) => ({
    id: `cat-${catIndex}`,
    title: cat.name,
    weight: catIndex,
    episode_id: 'current',
    description: '',
    content_block_items: cat.items.map((item, itemIndex) => ({
      id: `item-${catIndex}-${itemIndex}`,
      note: item.title,
      weight: itemIndex,
      content_block_id: `cat-${catIndex}`,
      news_id: `news-${catIndex}-${itemIndex}`,
      content: {
        id: `content-${catIndex}-${itemIndex}`,
        version: 1,
        content_type: 'video',
        content_url: item.videoUrl,
        content_id: extractVideoId(item.videoUrl),
        content_created_at: new Date().toISOString(),
        thumbnail_url: item.thumbnailUrl,
        submitted_by: 'api',
        submitted_at: new Date().toISOString(),
        category: cat.name,
        categories: [],
        description: item.title
      }
    }))
  }));
}
```

### Pattern 3: Static JSON Content

```typescript
// Static content for demo/testing
const staticContent: LiveViewContentBlock[] = [
  {
    id: "demos",
    title: "Demo Videos",
    weight: 0,
    episode_id: "static",
    description: "Demo content",
    content_block_items: [
      {
        id: "demo-1",
        note: "React Three Fiber Tutorial",
        weight: 0,
        content_block_id: "demos",
        news_id: "demo-news-1",
        content: {
          id: "demo-content-1",
          version: 1,
          content_type: "video",
          content_url: "https://youtube.com/watch?v=dQw4w9WgXcQ",
          content_id: "dQw4w9WgXcQ",
          content_created_at: "2024-01-01T00:00:00Z",
          thumbnail_url: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
          submitted_by: "admin",
          submitted_at: "2024-01-01T00:00:00Z",
          category: "tutorials",
          categories: ["react", "3d", "tutorial"],
          description: "Learn React Three Fiber basics"
        }
      }
    ]
  }
];
```

---

## Troubleshooting Data Issues

### Issue: Content not displaying

**Check**:
1. Content array is not empty: `content.length > 0`
2. Each category has items: `block.content_block_items.length > 0`
3. All required fields exist (use validation functions above)
4. URLs are valid and accessible
5. Console for errors: `ContentStore.setContent()` warnings

### Issue: Navigation not working

**Check**:
1. `categoryIds` and `itemIds` arrays populated
2. `activeCategoryIndex` and `activeItemIndex` are valid indices
3. Weights are properly sorted
4. No duplicate IDs in categories or items

### Issue: Items displaying in wrong order

**Check**:
1. Weights are ascending: `0, 1, 2, ...`
2. No duplicate weights
3. Items sorted after fetch: `.sort((a, b) => a.weight - b.weight)`

### Issue: Thumbnails not loading

**Check**:
1. `thumbnail_url` is valid URL
2. CORS headers allow loading
3. Image exists at URL
4. `WTF_CONFIG.useRelativeImagePaths` setting matches your setup

---

## Summary

### Critical Required Fields

For WTF to function, you **must** provide:

1. **At least one category** with:
   - `id`, `title`, `weight`, `episode_id`, `description`
   - At least one `content_block_item`

2. **Each item must have**:
   - `id`, `note`, `weight`, `content_block_id`, `news_id`
   - A `content` object

3. **Each content object must have**:
   - `id`, `content_type`, `content_url`, `content_id`
   - `thumbnail_url` (for 3D display)
   - Timestamps and metadata

### Everything Else is Optional

- Callbacks (onCategoryChange, etc.)
- Initial state (initialCategoryId, etc.)
- Plugins (audio, dev controls)
- UI elements (legend, details)
- Navigation methods (keyboard, swipe)

---

*Last Updated: October 11, 2025*
*Version: 2.0 - Props-based API*
