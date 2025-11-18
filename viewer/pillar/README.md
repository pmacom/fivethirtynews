# Pillar - 3D Content Display System

## Purpose

The **pillar** directory contains the core 3D content display system that arranges content in a cylindrical layout. Categories are arranged in a circle, with content items stacked vertically within each category column.

## Why It Exists

The pillar provides an intuitive, visually engaging way to browse categorized content in 3D space. Users can rotate around the cylinder to view different categories and navigate up/down within each category's content stack.

## Directory Structure

```
pillar/
├── pillar.tsx              # Main orchestrator component
├── components/             # Display components
│   ├── PillarColumn.tsx           # Vertical content column
│   ├── PillarColumnItem.tsx       # Individual content wrapper
│   └── PlaneView.tsx              # Advanced thumbnail renderer
│
└── templates/              # Content rendering templates
    ├── TemplateSwitcher.tsx       # Routes to correct template
    ├── Tweet.tsx                  # Twitter content display
    ├── Default.tsx                # Fallback template
    └── [future: Video, Website, Discord, etc.]
```

## Important Files

### pillar.tsx

**What it does:** Main component that orchestrates the cylindrical layout and rotation animations.

**Key responsibilities:**
- Calculates cylindrical positions for each category
- Manages rotation animations using React Spring
- Responds to active category changes
- Positions columns in 3D space

**Layout math:**
```typescript
// Calculate radius based on number of categories
radius = 0.5 / Math.sin(Math.PI / numberOfCategories)

// Position each category around the circle
angle = (index / numberOfCategories) * Math.PI * 2
x = Math.sin(angle) * radius
z = Math.cos(angle) * radius
```

### components/PillarColumn.tsx

**What it does:** Renders a vertical column of content items for one category.

**Key responsibilities:**
- Receives array of content items
- Stacks items vertically with spacing
- Passes through rotation state
- Manages column-level animations

### components/PillarColumnItem.tsx

**What it does:** Wraps individual content items with device-specific rotation and positioning.

**Key responsibilities:**
- Applies device rotation (mobile vs desktop)
- Positions item within column
- Determines active state
- Passes props to template

### components/PlaneView.tsx

**What it does:** Advanced thumbnail/video display with shader-based rendering.

**Key responsibilities:**
- Renders thumbnail images
- Handles video playback
- Shader-based blending effects
- Performance-optimized rendering

**Features:**
- Smooth transitions between thumbnail and video
- Shader effects for visual polish
- Efficient texture management

### templates/TemplateSwitcher.tsx

**What it does:** Routes content to the appropriate display template based on content type.

**Key responsibilities:**
- Examines content type
- Dynamically loads appropriate template
- Falls back to Default template if no match
- Passes through all props

**Flow:**
```
Content → TemplateSwitcher → Check type → Load template
                                ↓
                    ┌───────────┴────────────┐
                    │                        │
                Tweet Template        Default Template
```

### templates/Tweet.tsx

**What it does:** Specialized display for Twitter/X content.

**Key responsibilities:**
- Fetches tweet data from TweetStore
- Extracts video from tweets if present
- Displays tweet embed
- Handles Twitter-specific features

### templates/Default.tsx

**What it does:** Fallback template for content types without specialized templates.

**Key responsibilities:**
- Uses `@react-three/uikit` for rendering
- Displays thumbnail and basic info
- Works for any content type
- Graceful degradation

## Data Flow

```
1. contentStore → provides content array
          ↓
2. pillar.tsx → calculates positions
          ↓
3. PillarColumn → receives category items
          ↓
4. PillarColumnItem → wraps each item
          ↓
5. TemplateSwitcher → routes by type
          ↓
6. Tweet/Default → renders content
          ↓
7. PlaneView → displays media
```

## Navigation System

### User Input
- **Arrow Keys**: Left/Right (rotate categories), Up/Down (move within category)
- **Swipe**: Mobile gesture support

### State Updates
```typescript
// User presses left arrow
setNextColumn() called
  ↓
activeCategoryId updated in store
  ↓
pillar.tsx recalculates rotation
  ↓
React Spring animates rotation
  ↓
Camera adjusts via fitToBox()
```

### Rotation Animation

Uses `@react-spring/three` for smooth, hardware-accelerated animations:

```typescript
const spring = useSpring({
  rotation: calculateRotation(activeCategoryIndex),
  config: { tension: 120, friction: 14 }
})
```

## Layout Calculations

### Cylindrical Positioning

The pillar arranges categories in a perfect circle:

```typescript
function calculatePosition(index: number, total: number) {
  // Radius expands as more categories are added
  const radius = 0.5 / Math.sin(Math.PI / total)

  // Evenly distribute around circle
  const angle = (index / total) * Math.PI * 2

  return {
    x: Math.sin(angle) * radius,
    y: 0,
    z: Math.cos(angle) * radius
  }
}
```

### Vertical Stacking

Items within a column are stacked vertically:

```typescript
const itemSpacing = 1.5 // Distance between items
const yPosition = itemIndex * itemSpacing
```

## Adding New Templates

To add support for a new content type:

### 1. Create Template Component

```typescript
// templates/Video.tsx
import { createContentInstance, VideoContent } from '@/viewer/core/content'

export default function Video({ content, ...props }) {
  const instance = createContentInstance(content) as VideoContent
  const { videoId, platform } = instance.getDisplayInfo()

  return (
    <mesh {...props}>
      {/* Render video player */}
    </mesh>
  )
}
```

### 2. Update TemplateSwitcher

```typescript
// templates/TemplateSwitcher.tsx
import Video from './Video'

switch (content.content_type) {
  case ContentType.VIDEO:
    return <Video {...props} />
  // ...
}
```

### 3. Test Navigation

Ensure the new template:
- Renders correctly in 3D space
- Responds to active state
- Works with camera positioning
- Handles user interaction

## Performance Optimization

### Lazy Loading
Templates are loaded on-demand to reduce initial bundle size.

### Instance Culling
Off-screen content can be culled (future optimization).

### Shader Efficiency
PlaneView uses optimized shaders for rendering.

### Animation Performance
React Spring uses hardware acceleration for smooth 60fps animations.

## Common Patterns

### Accessing Content Instance

```typescript
import { createContentInstance } from '@/viewer/core/content'

const instance = createContentInstance(content)
const displayInfo = instance.getDisplayInfo()
```

### Checking Active State

```typescript
import { useContentStore } from '@/viewer/core/store/contentStore'

const activeItemId = useContentStore(s => s.activeItemId)
const isActive = content.id === activeItemId
```

### Accessing Metadata

```typescript
const metadata = instance.getMetadata()
// { id, category, description, submittedBy, etc. }
```

## Troubleshooting

### Content Not Appearing
- Check that content array is populated in contentStore
- Verify content has valid position data
- Check console for errors in template rendering

### Rotation Not Working
- Verify activeCategoryId is updating in store
- Check that rotation calculation is correct
- Ensure React Spring dependencies are installed

### Template Not Loading
- Check TemplateSwitcher has case for content type
- Verify template component exports default
- Check browser console for import errors

## Future Enhancements

- [ ] Complete templates for all content types (Video, Website, Discord, Warpcast, Image)
- [ ] Implement content preview on hover
- [ ] Add transition effects between templates
- [ ] Support multiple layout modes (see `_archive/display-experimental/`)
- [ ] Implement instance culling for performance
- [ ] Add LOD (level of detail) system

## Dependencies

- **@react-three/fiber** - React renderer for Three.js
- **@react-spring/three** - Animation library
- **@react-three/uikit** - UI rendering in 3D space
- **three** - 3D graphics library

## Related Documentation

- `/viewer/ARCHITECTURE.md` - Overall system design
- `/viewer/core/README.md` - Content type system
- `/viewer/scene/README.md` - Camera and 3D environment
- `/viewer/_archive/README.md` - Alternative layout systems
