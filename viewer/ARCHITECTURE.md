# Viewer Architecture

## Overview

The **Viewer** is a 3D content viewing system that displays categorized content (YouTube videos, tweets, images, websites, etc.) in an interactive 3D cylindrical arrangement. Users can navigate through categories and content items using keyboard controls or swipe gestures, with smooth camera animations and transitions.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      viewer.tsx                          │
│                   (Main Orchestrator)                    │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
   ┌─────────┐         ┌─────────┐       ┌──────────┐
   │  Scene  │         │  Pillar │       │    UI    │
   │ (3D Env)│         │(Content)│       │(Interface)│
   └─────────┘         └─────────┘       └──────────┘
        │                   │                   │
        │                   │                   │
   Components          Components          Components
   - Camera            - PillarColumn      - Legend
   - Effects           - ColumnItem        - Details
   - Listeners         - PlaneView         - Settings
                       - Templates
```

## Directory Structure

```
src/viewer/
├── ARCHITECTURE.md          # This file - system overview
├── viewer.tsx               # Main component orchestrator
│
├── core/                    # Shared abstractions and utilities
│   ├── README.md
│   ├── content/            # Content type system (OOP)
│   │   ├── BaseContent.ts          # Abstract base class
│   │   ├── TweetContent.ts         # Twitter/X handler
│   │   ├── VideoContent.ts         # YouTube/Vimeo handler
│   │   ├── WebsiteContent.ts       # Generic website handler
│   │   ├── DiscordContent.ts       # Discord message handler
│   │   ├── WarpcastContent.ts      # Farcaster/Warpcast handler
│   │   ├── ImageContent.ts         # Image handler
│   │   ├── ContentFactory.ts       # Factory for creating instances
│   │   ├── types.ts                # TypeScript interfaces/enums
│   │   ├── utils.ts                # Content utilities
│   │   └── index.ts                # Public exports
│   │
│   ├── store/              # State management
│   │   └── contentStore.tsx        # Zustand store for content
│   │
│   └── transforms/         # Layout calculations
│       └── [future: transform utilities]
│
├── pillar/                 # 3D Content Display System
│   ├── README.md
│   ├── pillar.tsx                  # Main pillar component
│   ├── components/
│   │   ├── PillarColumn.tsx        # Vertical content column
│   │   ├── PillarColumnItem.tsx    # Individual content wrapper
│   │   └── PlaneView.tsx           # Advanced thumbnail display
│   │
│   └── templates/          # Content rendering templates
│       ├── TemplateSwitcher.tsx    # Routes to correct template
│       ├── Tweet.tsx               # Twitter display
│       ├── Default.tsx             # Fallback template
│       └── [future: Video, Website, Discord, etc.]
│
├── scene/                  # 3D Environment
│   ├── README.md
│   ├── scene.tsx                   # Canvas wrapper
│   ├── SceneCamera.tsx             # Camera controls
│   ├── SceneEffects.tsx            # Post-processing
│   ├── SceneListeners.tsx          # Input handlers
│   └── store.tsx                   # Scene state
│
├── ui/                     # User Interface
│   ├── README.md
│   ├── ui.tsx                      # UI wrapper with auto-hide
│   ├── legend/                     # Category/item navigation
│   ├── details/                    # Content info panel
│   ├── settings/                   # Settings panel
│   ├── components/                 # Shared UI components
│   ├── store.tsx                   # UI state
│   └── styles.css                  # UI styles
│
├── audio/                  # Audio Features
│   ├── README.md
│   └── [audio visualization components]
│
├── models/                 # 3D Models
│   ├── README.md
│   └── [3D model components]
│
├── common/                 # Utilities
│   ├── README.md
│   ├── BehaviorDetection.tsx
│   ├── KeyListener.tsx
│   └── SwipeDetector.tsx
│
└── _archive/              # Archived Code
    ├── README.md
    └── display-experimental/       # Alternative display system
```

## Core Concepts

### 1. Content Type System (OOP Architecture)

All content types inherit from `BaseContent`:

```typescript
// Factory usage
import { createContentInstance } from '@/viewer/core/content'

const contentInstance = createContentInstance(contentData)
const displayInfo = contentInstance.getDisplayInfo()
const metadata = contentInstance.getMetadata()
```

**Benefits:**
- Type-safe content handling
- Extensible for new content types
- Centralized content logic
- Platform-specific features isolated in subclasses

### 2. Pillar Display System

The pillar arranges content in a 3D cylinder:

**Layout Math:**
```typescript
radius = 0.5 / Math.sin(Math.PI / numberOfCategories)
angle = (index / numberOfCategories) * Math.PI * 2
x = Math.sin(angle) * radius
z = Math.cos(angle) * radius
```

**Components:**
- `Pillar` - Orchestrates rotation and layout
- `PillarColumn` - Vertical stack of content items for one category
- `PillarColumnItem` - Wraps individual content with device rotation
- `PlaneView` - Renders thumbnail/video with shader effects
- `TemplateSwitcher` - Routes to appropriate template

### 3. State Management

**ContentStore** (`core/store/contentStore.tsx`):
- Fetches from Supabase: episodes → content_blocks → content_block_items
- Manages active category and item
- Navigation methods: `setNextColumn()`, `setPrevColumn()`, etc.
- Video controls: seeking, playback state

**SceneStore** (`scene/store.tsx`):
- Canvas dimensions
- Camera positioning via `fitToBox()`

**UI Stores**: Individual stores for legend, details, settings

### 4. Data Flow

```
1. ContentStore.fetchLatestEpisode()
   ↓
2. Supabase: episodes → content_blocks → content_block_items
   ↓
3. Pillar receives content array
   ↓
4. TemplateSwitcher routes to Tweet/Default template
   ↓
5. Content rendered in 3D space
   ↓
6. User navigates (arrow keys/swipe)
   ↓
7. ContentStore updates activeCategoryId/activeItemId
   ↓
8. Pillar animates rotation
   ↓
9. SceneCamera.fitToBox() zooms to item
   ↓
10. Legend & Details update
```

## Key Features

### Navigation
- **Arrow Keys**: Left/Right (categories), Up/Down (items within category)
- **Swipe Gestures**: Mobile support
- **Smooth Animations**: React Spring for rotation and camera

### Content Support
- **VIDEO**: YouTube, Vimeo
- **TWITTER**: Tweets with video extraction
- **WARPCAST**: Farcaster protocol posts
- **WEBSITE**: Generic links with favicon
- **DISCORD**: Discord message links
- **IMAGE**: Image URLs

### Camera
- **Auto-framing**: `fitToBox()` centers active content
- **Freelook Mode**: Optional manual camera control
- **Smooth Transitions**: Animated movements

### UI
- **Auto-hide**: Hides on inactivity, shows on mouse movement
- **Legend**: Visual category/item navigation
- **Details**: Info panel with video controls
- **Settings**: Camera, audio, visual options

## Adding New Features

### Adding a New Content Type

1. Create content class in `core/content/`:
```typescript
// NewTypeContent.ts
export class NewTypeContent extends BaseContent {
  getType() { return ContentType.NEWTYPE }
  getDisplayInfo() { /* ... */ }
}
```

2. Update `ContentFactory.ts`:
```typescript
case ContentType.NEWTYPE:
  return new NewTypeContent(data)
```

3. Create template in `pillar/templates/`:
```typescript
// NewType.tsx
export default function NewType({ content }) {
  const instance = createContentInstance(content)
  // Render using instance.getDisplayInfo()
}
```

4. Update `TemplateSwitcher.tsx`:
```typescript
case ContentType.NEWTYPE:
  return <NewType {...props} />
```

### Adding a New Display Layout

For alternative layouts (sphere, grid, etc.):

1. Create in `pillar/layouts/` (future directory)
2. Implement position calculation function
3. Add to layout switcher

Reference `_archive/display-experimental/` for transform examples.

## Performance Considerations

- **Lazy Loading**: Templates loaded on-demand
- **Shader Optimization**: PlaneView uses efficient shaders
- **React Spring**: Hardware-accelerated animations
- **Zustand**: Minimal re-renders with granular subscriptions

## Testing

Before committing changes:
```bash
npm run build    # Ensure TypeScript compiles
npm run dev      # Test in browser
```

Navigate between categories and items to verify:
- Smooth rotations
- Camera positioning
- Content rendering
- UI updates

## Archive

`_archive/display-experimental/` contains a complete alternative architecture with:
- Multiple transform functions (sphere, lineup, random)
- Physics-based positioning
- Different camera approach

Archived for future reference. May be useful for adding alternative layouts.

## Future Enhancements

- [ ] Additional templates (Video, Website, Discord, Warpcast, Image)
- [ ] Multiple layout modes (sphere, grid, wave)
- [ ] Content search and filtering
- [ ] Keyboard shortcuts overlay
- [ ] Analytics integration
- [ ] Performance monitoring

## Related Documentation

- `/viewer/core/README.md` - Core abstractions
- `/viewer/pillar/README.md` - Display system details
- `/viewer/scene/README.md` - 3D environment
- `/viewer/ui/README.md` - Interface components
- `/viewer/_archive/README.md` - Archived code explanation
