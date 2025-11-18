# UI - User Interface Components

## Purpose

The **ui** directory contains all 2D user interface components that overlay the 3D scene, including navigation controls, content details, and settings panels.

## Why It Exists

The UI provides essential information and controls to users, including category navigation, content details, playback controls, and system settings. It auto-hides during inactivity to maximize the 3D viewing experience.

## Directory Structure

```
ui/
├── ui.tsx                  # Main UI wrapper with auto-hide
├── legend/                 # Category/item navigation display
├── details/                # Content info and video controls
├── settings/               # Settings panel
├── components/             # Shared UI components
├── store.tsx              # UI state management
└── styles.css             # UI styles
```

## Important Files & Directories

### ui.tsx

**What it does:** Main wrapper component that implements auto-hide behavior.

**Key responsibilities:**
- Wraps all UI panels
- Auto-hides on inactivity (configurable delay)
- Shows on mouse movement
- Manages visibility state

**Behavior:**
- **Inactive**: UI fades out after 3 seconds of no mouse movement
- **Active**: UI appears when mouse moves
- **Hover**: UI stays visible when hovering over UI elements

### legend/

**What it does:** Visual navigation display showing categories and content items.

**Key responsibilities:**
- Shows all available categories
- Highlights active category
- Displays items within active category
- Provides quick visual overview

**Typical display:**
```
Categories: [Tech] Design  Art  News
Items: 1 [2] 3 4 5
```

Active items are highlighted with brackets or different styling.

### details/

**What it does:** Bottom panel displaying information about the active content item.

**Key responsibilities:**
- Shows content title, description, category
- Displays video playback controls (if video content)
- Shows metadata (author, date, etc.)
- Provides content-specific actions

**Features:**
- **Video controls**: Play/pause, seek, volume
- **Metadata display**: Description, categories, timestamp
- **Content actions**: Open in new tab, share, etc.

### settings/

**What it does:** Settings panel for configuring viewer behavior.

**Key responsibilities:**
- Camera settings (freelook toggle, etc.)
- Visual effects toggles
- Audio settings (if audio features enabled)
- Display preferences

**Typical settings:**
- Camera freelook mode
- Post-processing effects
- Auto-hide delay
- Audio visualization
- Debug mode (via Leva)

### components/

**What it does:** Shared UI components used across panels.

**Examples:**
- Buttons
- Sliders
- Toggle switches
- Icons

### store.tsx

**What it does:** Zustand store for UI state.

**Key state:**
- UI visibility (shown/hidden)
- Active panel (legend, details, settings)
- User preferences

**Key methods:**
- `showUI()` - Make UI visible
- `hideUI()` - Hide UI
- `togglePanel(panel)` - Show/hide specific panel

### styles.css

**What it does:** CSS styles for UI components.

**Contains:**
- Panel layouts
- Animations (fade in/out)
- Responsive breakpoints
- Theme variables

## Auto-Hide System

### How It Works

```
1. User moves mouse
      ↓
2. RevealOnMovement detects movement
      ↓
3. showUI() called
      ↓
4. UI fades in
      ↓
5. Timer starts (3s default)
      ↓
6. No movement detected
      ↓
7. hideUI() called
      ↓
8. UI fades out
```

### Preventing Auto-Hide

UI stays visible when:
- Mouse is hovering over UI elements
- User is interacting with controls
- Settings panel is open
- Video controls are active

## State Synchronization

UI components subscribe to multiple stores:

```typescript
// Legend subscribes to content store
const {
  contents,
  activeCategoryId,
  activeItemId
} = useContentStore()

// Details subscribes to both content and UI stores
const activeContent = useContentStore(s => s.activeContent)
const isVideoPlaying = useUIStore(s => s.isVideoPlaying)
```

## Responsive Design

UI adapts to different screen sizes:

- **Desktop**: Full panels with detailed info
- **Tablet**: Compact panels, icons instead of text
- **Mobile**: Minimal UI, swipe gestures primary navigation

Breakpoints defined in `styles.css`.

## Common Patterns

### Accessing UI State

```typescript
import { useUIStore } from '@/viewer/ui/store'

function MyPanel() {
  const isVisible = useUIStore(s => s.isVisible)
  const showUI = useUIStore(s => s.showUI)

  return isVisible ? <div>Panel content</div> : null
}
```

### Preventing Auto-Hide

```typescript
function MyPanel() {
  const { showUI } = useUIStore()

  return (
    <div
      onMouseEnter={() => showUI()}
      onMouseLeave={() => {/* Timer will handle hide */}}
    >
      Panel content
    </div>
  )
}
```

### Accessing Content Info

```typescript
import { useContentStore } from '@/viewer/core/store/contentStore'
import { createContentInstance } from '@/viewer/core/content'

function Details() {
  const activeContent = useContentStore(s => s.activeContent)

  if (!activeContent) return null

  const instance = createContentInstance(activeContent.content)
  const displayInfo = instance.getDisplayInfo()

  return <div>{displayInfo.title}</div>
}
```

## Adding New Panels

To add a new UI panel:

### 1. Create Panel Component

```typescript
// ui/my-panel/MyPanel.tsx
export default function MyPanel() {
  const isVisible = useUIStore(s => s.panels.myPanel)

  if (!isVisible) return null

  return (
    <div className="my-panel">
      {/* Panel content */}
    </div>
  )
}
```

### 2. Update UI Store

```typescript
// ui/store.tsx
interface UIState {
  panels: {
    legend: boolean
    details: boolean
    settings: boolean
    myPanel: boolean  // Add new panel
  }
}
```

### 3. Add to ui.tsx

```typescript
// ui/ui.tsx
import MyPanel from './my-panel/MyPanel'

<RevealOnMovement>
  <Legend />
  <Details />
  <Settings />
  <MyPanel />  {/* Add panel */}
</RevealOnMovement>
```

## Styling Guidelines

### CSS Variables

Use CSS variables for consistency:

```css
:root {
  --ui-bg: rgba(0, 0, 0, 0.8);
  --ui-text: #ffffff;
  --ui-accent: #00ff88;
  --ui-border: rgba(255, 255, 255, 0.2);
}
```

### Animation

Use consistent transitions:

```css
.panel {
  transition: opacity 0.3s ease-in-out;
}
```

## Troubleshooting

### UI Not Appearing
- Check `isVisible` state in UIStore
- Verify mouse movement is being detected
- Check CSS z-index values

### Auto-Hide Not Working
- Verify timer is being set
- Check for hover states preventing hide
- Ensure RevealOnMovement is wrapping UI

### Content Info Not Updating
- Check content store subscription
- Verify activeContent is being updated
- Check createContentInstance is being called

## Dependencies

- **React** - UI framework
- **zustand** - State management
- **@/viewer/core/content** - Content instances
- **@/viewer/core/store** - Content state

## Related Documentation

- `/viewer/ARCHITECTURE.md` - Overall system architecture
- `/viewer/core/README.md` - Content system
- `/viewer/scene/README.md` - 3D environment
