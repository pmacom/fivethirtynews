# WTF - Interactive 3D Content Explorer

> **W**eb **T**hree **F**iber-based audio-reactive 3D content visualization system

A modular, feature-based React Three Fiber application for creating immersive 3D content experiences with audio reactivity, dynamic navigation, and real-time state management.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Core Concepts](#core-concepts)
4. [Features](#features)
5. [State Management](#state-management)
6. [Integration Guide](#integration-guide)
7. [API Reference](#api-reference)
8. [Development Guidelines](#development-guidelines)
9. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Simple Usage (Props-Based)

```tsx
'use client'

import { useState, useEffect } from 'react';
import WTF from '@/wtf/WTF'
import { LiveViewContentBlock } from '@/wtf/Content/types';

export default function Page() {
  const [content, setContent] = useState<LiveViewContentBlock[]>([]);

  useEffect(() => {
    // Fetch your content data from any source
    // (Supabase, REST API, GraphQL, static JSON, etc.)
    fetchMyContent().then(data => setContent(data));
  }, []);

  return <WTF content={content} />
}
```

**Key Change**: WTF is now a **pure, props-based component**. You control data fetching, and WTF handles 3D visualization.

### With Plugins & Callbacks

```tsx
<WTF
  content={content}
  enableAudio={true}
  enableDevControls={process.env.NODE_ENV === 'development'}
  onItemChange={(id, index, data) => {
    console.log('User selected:', data);
    trackAnalytics('item_view', id);
  }}
/>
```

### Configuration

```typescript
// src/wtf/config.ts
export const WTF_CONFIG = {
  useRelativeImagePaths: false, // Toggle between local/remote images
}
```

---

## Architecture Overview

### Directory Structure

```
src/wtf/
├── Audio/              # Audio reactivity system (Optional plugin)
├── Content/            # Content management & navigation (Props-based)
├── Details/            # Content details panel (UI component)
├── Info/               # Info display overlay
├── Legend/             # Navigation legend sidebar
├── Models/             # 3D models (Logo530, Web, AudioResponsiveSphere)
├── Pillar/             # Main content display (3D pillar layout)
├── Scene/              # 3D scene management (Camera, Effects, Listeners)
├── Settings/           # Application settings UI (Optional plugin)
├── UI/                 # UI layer wrapper & movement detection
├── common/             # Shared behaviors (KeyListener, SwipeDetector)
├── display/            # Experimental display system
├── plugins/            # ✨ NEW: Optional feature plugins
│   ├── AudioPlugin.tsx        # Audio reactivity (opt-in)
│   └── DevControlsPlugin.tsx  # Leva controls (opt-in)
├── utils/              # Shared utilities (mathUtils)
├── types.ts            # ✨ NEW: WTFProps interface
├── config.ts           # Global configuration
├── WTF.tsx             # Main orchestrator component (Props-based)
└── examples/           # ✨ NEW: Usage examples
    └── BasicUsage.tsx
```

### Technology Stack

- **React Three Fiber**: 3D rendering
- **Zustand-x**: State management (internal)
- **Framer Motion**: UI animations
- **Leva**: Development controls (optional plugin)
- **Web Audio API**: Audio analysis (optional plugin)

**Note**: WTF is now **data-source agnostic**. Use any backend (Supabase, REST API, GraphQL, static JSON, etc.)

---

## Core Concepts

### 1. Feature-Based Architecture

Each directory represents a self-contained feature module:

```
Feature/
├── components/         # Feature-specific components
├── templates/          # Content templates (optional)
├── utils/              # Feature utilities
├── [Feature].tsx       # Main feature component
├── [feature]Store.ts   # Zustand state store
└── types.ts            # TypeScript types
```

### 2. Zustand-x Store Pattern

All state management uses the `zustand-x` pattern:

```typescript
import { createStore } from "zustand-x";

interface StoreState {
  value: number;
}

export const MyStore = createStore('my-store')<StoreState>({
  value: 0,
}).extendActions((set, get, api) => ({
  increment: () => {
    const current = get.value();
    set.value(current + 1);
  }
}));

// Usage in components
const value = MyStore.use.value();
MyStore.set.increment();
```

### 3. Props-Based API

WTF is now a **controlled component** that accepts data as props:

```typescript
interface WTFProps {
  // Required
  content: LiveViewContentBlock[];

  // Optional: Initial state
  initialCategoryId?: string;
  initialItemId?: string;

  // Optional: Callbacks
  onCategoryChange?: (categoryId: string, categoryIndex: number) => void;
  onItemChange?: (itemId: string, itemIndex: number, itemData: LiveViewContentBlockItems) => void;
  onItemClick?: (itemData: LiveViewContentBlockItems) => void;

  // Optional: UI customization
  showLegend?: boolean;
  showDetails?: boolean;
  children?: React.ReactNode;

  // Optional: Plugins
  enableAudio?: boolean;
  enableDevControls?: boolean;
  enableKeyboard?: boolean;
  enableSwipe?: boolean;
}
```

**Benefits**:
- ✅ Use any data source (not just Supabase)
- ✅ Parent controls data fetching & state
- ✅ Easier testing (pass mock data)
- ✅ Better bundle size (opt-in plugins)

### 4. Content Structure

Content is organized in a hierarchical structure:

```
Episode
  └── ContentBlocks (Categories)
       └── ContentBlockItems (Items)
            └── Content (Media)
```

---

## Features

### 🎯 Core Features

#### Props-Based Content

WTF accepts content as props instead of fetching internally:

```tsx
import { useState, useEffect } from 'react';
import WTF from '@/wtf/WTF';

function MyPage() {
  const [content, setContent] = useState([]);

  useEffect(() => {
    // Fetch from ANY source
    fetch('/api/content').then(res => res.json()).then(setContent);
    // OR use Supabase, GraphQL, static data, etc.
  }, []);

  return <WTF content={content} />;
}
```

#### Callbacks for User Interactions

Track user navigation with callback props:

```tsx
<WTF
  content={content}
  onCategoryChange={(id, index) => {
    console.log('User navigated to category:', id);
    updateURL(`/category/${id}`);
  }}
  onItemChange={(id, index, data) => {
    console.log('User selected item:', data);
    trackAnalytics('item_view', id);
  }}
/>
```

#### UI Customization

Control which UI elements are shown:

```tsx
<WTF
  content={content}
  showLegend={true}      // Show navigation sidebar
  showDetails={true}     // Show content details panel
  enableKeyboard={true}  // Arrow key navigation
  enableSwipe={true}     // Touch gesture navigation
/>
```

### 🔌 Optional Plugins

#### Audio Reactivity Plugin

Real-time audio analysis (opt-in):

```tsx
<WTF
  content={content}
  enableAudio={true}  // Enables audio analysis
/>
```

```typescript
// Access audio data in custom components
import AudioStore from '@/wtf/Audio/audioStore';

const low = AudioStore.use.low();      // Bass frequencies
const mid = AudioStore.use.mid();      // Mid frequencies
const high = AudioStore.use.high();    // High frequencies
const amplitude = AudioStore.use.amplitude(); // Overall volume
```

**Features:**
- Device selection (choose audio input/output)
- Real-time frequency analysis (low, mid, high bands)
- Adjustable gain controls
- Connection status monitoring

#### Dev Controls Plugin

Development panel with Leva controls (opt-in):

```tsx
<WTF
  content={content}
  enableDevControls={process.env.NODE_ENV === 'development'}
/>
```

**Features:**
- Leva control panel for tweaking parameters
- Settings panel with toggles
- Camera controls
- Audio settings (when audio enabled)

### 🎮 Input Handling

Built-in keyboard and swipe navigation (enabled by default):

```tsx
<WTF
  content={content}
  enableKeyboard={true}  // Arrow keys to navigate
  enableSwipe={true}     // Touch gestures to navigate
/>
```

Navigation is handled internally and triggers your callbacks:
- **Left/Right arrows** or **horizontal swipes**: Navigate categories
- **Up/Down arrows** or **vertical swipes**: Navigate items within category

### 🎨 Custom 3D Content

Add your own 3D models via children prop:

```tsx
<WTF content={content}>
  {/* Your custom 3D objects render alongside the content pillar */}
  <mesh position={[0, 5, 0]}>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="hotpink" />
  </mesh>

  {/* Access audio data in custom models */}
  <AudioReactiveSphere />
</WTF>
```

**Built-in 3D Features:**
- Pillar layout for content display
- Custom camera controls
- Visual effects
- Lighting system
- Logo530 model included

### 🖼️ Content Templates

Extensible template system for different content types:

```typescript
// src/wtf/Pillar/templates/Default.tsx
export const TemplateDefault = ({ item, categoryId, itemIndex }) => {
  return (
    <PlaneView
      imageUrl={item.content.thumbnail_url}
      videoUrl={videoUrl}
      onClick={handleClick}
    />
  );
};

// src/wtf/Pillar/templates/Tweet.tsx
export const TemplateTweet = ({ item }) => {
  // Custom tweet rendering
};
```

---

## State Management

### Core Stores

#### AudioStore (`Audio/audioStore.tsx`)
```typescript
interface AudioStoreState {
  deviceId: string;
  audioDevices: MediaDeviceInfo[];
  isStreamActive: boolean;
  frequencyData: Float32Array;
  low: number;
  mid: number;
  high: number;
  amplitude: number;
}
```

#### ContentStore (`Content/contentStore.ts`)
```typescript
interface ContentStoreState {
  episodeId: string | null;
  content: LiveViewContentBlock[];
  activeCategoryId: string;
  activeItemId: string;
  activeCategoryIndex: number;
  activeItemIndex: number;
  activeItemData: LiveViewContentBlockItems | null;
}
```

#### SceneStore (`Scene/sceneStore.ts`)
```typescript
interface SceneStoreState {
  cameraPosition: [number, number, number];
  cameraRotation: [number, number, number];
  cameraFov: number;
}
```

#### SettingsStore (`Settings/settingsStore.ts`)
```typescript
interface SettingsStoreState {
  useKeyboard: boolean;
  isAudioReactivityEnabled: boolean;
  showLegend: boolean;
  showDetails: boolean;
}
```

---

## Integration Guide

### Adding WTF to Your Next.js Project

#### 1. Install Dependencies

```bash
npm install @react-three/fiber @react-three/drei three
npm install zustand zustand-x
npm install framer-motion

# Optional: Only if using plugins
npm install leva  # For enableDevControls
```

#### 2. Prepare Your Content Data

WTF expects content in this format:

```typescript
import { LiveViewContentBlock } from '@/wtf/Content/types';

const content: LiveViewContentBlock[] = [
  {
    id: 'category-1',
    title: 'Tech News',
    weight: 0,
    episode_id: 'ep-1',
    description: 'Latest tech updates',
    content_block_items: [
      {
        id: 'item-1',
        note: 'Cool article',
        weight: 0,
        content_block_id: 'category-1',
        news_id: 'news-1',
        content: {
          id: 'content-1',
          content_type: 'video',
          content_url: 'https://youtube.com/watch?v=...',
          content_id: 'yt-123',
          thumbnail_url: 'https://...',
          description: 'Video description',
          // ... other fields
        }
      }
    ]
  }
];
```

#### 3. Fetch Content from Your Backend

```tsx
'use client';

import { useState, useEffect } from 'react';
import WTF from '@/wtf/WTF';
import { LiveViewContentBlock } from '@/wtf/Content/types';

export default function WTFPage() {
  const [content, setContent] = useState<LiveViewContentBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Option 1: Fetch from REST API
    fetch('/api/content')
      .then(res => res.json())
      .then(data => {
        setContent(data);
        setLoading(false);
      });

    // Option 2: Use Supabase
    // const { data } = await supabase.from('content_blocks').select('...');

    // Option 3: Use GraphQL
    // const { data } = await apolloClient.query({ query: GET_CONTENT });

    // Option 4: Static data
    // setContent(staticContentData);
  }, []);

  if (loading) return <div>Loading...</div>;

  return <WTF content={content} />;
}
```

#### 4. (Optional) Setup Supabase

If you're using Supabase, create a client:

```typescript
// utils/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

**Database Schema** (if using Supabase):
- `episodes` - Episode metadata
- `content_blocks` - Content categories
- `content_block_items` - Items within categories
- `content` - Actual media content
- `tweets` - Tweet content (optional)

See `/src/wtf/examples/BasicUsage.tsx` for complete Supabase example.

### Complete Usage Examples

See `/src/wtf/examples/BasicUsage.tsx` for 6 complete examples:

1. **Basic Usage** - Simple data fetching and display
2. **With Callbacks** - Track user interactions
3. **With Plugins** - Enable audio and dev controls
4. **Custom Initial State** - Start at specific category/item
5. **Minimal Viewer** - No UI, just 3D content
6. **With Custom Models** - Add your own 3D objects

### Advanced Customization

#### Adding Custom 3D Models

```tsx
<WTF content={content}>
  <MyAudioReactiveModel />
  <CustomLighting />
</WTF>
```

#### Creating Custom Content Templates

For different content types (tweets, videos, images), extend the template system in `Pillar/templates/`.

---

## API Reference

### WTF Component Props

```typescript
interface WTFProps {
  // Required
  content: LiveViewContentBlock[];         // Your content data

  // Optional: Initial state
  initialCategoryId?: string;              // Start at specific category
  initialItemId?: string;                  // Start at specific item

  // Optional: Callbacks
  onCategoryChange?: (categoryId: string, categoryIndex: number) => void;
  onItemChange?: (itemId: string, itemIndex: number, itemData: LiveViewContentBlockItems) => void;
  onItemClick?: (itemData: LiveViewContentBlockItems) => void;

  // Optional: UI customization
  showLegend?: boolean;                    // Default: true
  showDetails?: boolean;                   // Default: true
  children?: React.ReactNode;              // Custom 3D models

  // Optional: Plugins
  enableAudio?: boolean;                   // Default: false
  enableDevControls?: boolean;             // Default: false
  enableKeyboard?: boolean;                // Default: true
  enableSwipe?: boolean;                   // Default: true

  // Optional: Styling
  className?: string;
}
```

### Content Store (Internal)

The ContentStore is now controlled by props, but you can still access it:

```typescript
import ContentStore from '@/wtf/Content/contentStore';

// Read current state
const content = ContentStore.use.content();
const activeItemId = ContentStore.use.activeItemId();
const activeItemData = ContentStore.use.activeItemData();

// Navigate (triggered by keyboard/swipe automatically)
ContentStore.set.setNextColumn();  // Next category
ContentStore.set.setPrevColumn();  // Previous category
ContentStore.set.setNextItem();    // Next item
ContentStore.set.setPrevItem();    // Previous item
```

### Shared Utilities

#### mathUtils

```typescript
import { roundFloat, clamp, normalize, lerp } from '@/wtf/utils/mathUtils';

roundFloat(3.14159);              // 3.1416 (4 decimal places)
clamp(150, 0, 100);               // 100
normalize(50, 0, 100, 0, 1);      // 0.5
lerp(0, 100, 0.5);                // 50
```

#### audioUtils (when enableAudio={true})

```typescript
import {
  normalizeDecibelValue,
  getFrequencyRanges,
  applyAndAdjustGain
} from '@/wtf/Audio/utils/audioUtils';

normalizeDecibelValue(-60);  // Normalize dB value to 0-1
```

#### contentUtils

```typescript
import { extractYoutubeVideoId } from '@/wtf/Content/utils/contentUtils';

extractYoutubeVideoId('https://youtube.com/watch?v=abc123');  // 'abc123'
```

---

## Development Guidelines

### Naming Conventions

✅ **DO:**
- PascalCase for components: `AudioListener.tsx`, `PlaneView.tsx`
- camelCase for stores: `audioStore.tsx`, `contentStore.ts`
- camelCase for utilities: `mathUtils.ts`, `audioUtils.ts`
- PascalCase for feature directories: `Audio/`, `Content/`
- camelCase for utility directories: `common/`, `utils/`

❌ **DON'T:**
- Mix naming conventions
- Use abbreviations (`AudioListen` ❌, use `AudioListener` ✅)
- Create duplicate store files

### Code Quality

✅ **DO:**
- Use shared utilities (DRY principle)
- Add all dependencies to React Hook arrays
- Include alt text on images
- Type your stores and components

❌ **DON'T:**
- Duplicate utility functions
- Skip dependency arrays
- Leave debug `console.log` statements in production
- Use `any` types unless absolutely necessary

### Adding New Features

1. **Create feature directory** in PascalCase: `MyFeature/`
2. **Create store** if needed: `myFeatureStore.ts`
3. **Create main component**: `MyFeature.tsx`
4. **Add types**: `types.ts`
5. **Export from feature**: `export { MyFeature } from './MyFeature'`
6. **Import in WTF.tsx**: Add to main orchestrator

---

## Troubleshooting

### Common Issues

#### Audio Not Working

**Issue:** No audio reactivity
**Solution:**
1. Check browser permissions (microphone/audio access)
2. Select correct audio device in Settings
3. Enable audio reactivity in Settings
4. Check console for Web Audio API errors

#### Content Not Loading

**Issue:** Empty content display
**Solution:**
1. Verify your content prop is not empty: `console.log(content)`
2. Check content data structure matches `LiveViewContentBlock[]` type
3. Ensure content has at least one category with items
4. Check browser console for errors

#### Import Errors

**Issue:** `Module not found` errors
**Solution:**
1. Use correct casing: `@/wtf/Audio/` not `@/wtf/audio/`
2. Check relative import depth: `../` vs `../../`
3. Verify file extensions (.ts vs .tsx)

#### Build Errors

**Issue:** TypeScript compilation errors
**Solution:**
1. Run `npm run build` to see all errors
2. Check dependency arrays in useEffect/useCallback/useMemo
3. Ensure all imports use correct paths
4. Verify all types are properly exported

### Performance Optimization

**Slow rendering:**
- Reduce `analyserNode.fftSize` in audioStore
- Use `React.memo()` for expensive components
- Implement proper memoization with useMemo/useCallback
- Check for unnecessary re-renders with React DevTools

**High memory usage:**
- Clean up audio streams when not in use
- Dispose of Three.js geometries and materials
- Use texture compression for images
- Implement proper cleanup in useEffect returns

---

## Additional Resources

### Documentation

- [WTF_REFACTOR_MASTER_PLAN.md](./WTF_REFACTOR_MASTER_PLAN.md) - Complete refactoring history
- [DIRECTORY_RENAME_COMPLETE.md](./DIRECTORY_RENAME_COMPLETE.md) - Directory rename documentation
- [CLEANUP_SUMMARY.md](./CLEANUP_SUMMARY.md) - Code cleanup summary

### Dependencies Documentation

- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [Three.js](https://threejs.org/docs/)
- [Zustand](https://docs.pmnd.rs/zustand)
- [Supabase](https://supabase.com/docs)
- [Framer Motion](https://www.framer.com/motion/)

---

## Contributing

When contributing to WTF:

1. Follow established naming conventions
2. Add TypeScript types for new features
3. Update this README with new features
4. Test audio reactivity and content navigation
5. Ensure build passes: `npm run build`
6. Document any new stores or utilities

---

## License

Part of the 530Show project.

---

## Migration Guide (v1 to v2)

### Breaking Changes

**Old API (v1)**:
```tsx
// WTF fetched its own data from Supabase
<WTF />
```

**New API (v2)**:
```tsx
// WTF now accepts data as props
const [content, setContent] = useState([]);
// ... fetch your data
<WTF content={content} />
```

### Key Changes

1. **Data Fetching**: Moved from internal (Supabase) to external (props)
2. **Audio**: Now opt-in plugin via `enableAudio={true}`
3. **Dev Controls**: Now opt-in plugin via `enableDevControls={true}`
4. **Callbacks**: New props for tracking user interactions
5. **ContentStore**: Now accepts external data via `setContent()` instead of `fetchLatestEpisode()`

### Migration Steps

1. Move data fetching to parent component
2. Pass content as prop: `<WTF content={myData} />`
3. (Optional) Enable plugins: `enableAudio={true}` `enableDevControls={true}`
4. (Optional) Add callbacks: `onItemChange={(id, index, data) => ...}`

---

*Last Updated: October 11, 2025*
*Version: 2.0 - Props-based API*
*Architecture: Feature-based modular design with optional plugins*
