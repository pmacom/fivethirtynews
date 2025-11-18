# Scene - 3D Environment

## Purpose

The **scene** directory contains all components related to the 3D rendering environment, including the canvas, camera controls, post-processing effects, and input listeners.

## Why It Exists

The scene provides the 3D stage where content is displayed. It manages the camera, lighting, effects, and user input to create an immersive viewing experience.

## Important Files

### scene.tsx

**What it does:** Main canvas wrapper that sets up the Three.js rendering context.

**Key responsibilities:**
- Creates `<Canvas>` component from @react-three/fiber
- Contains camera, effects, and content
- Sets up rendering parameters
- Provides 3D context to child components

**Contains:**
- `<SceneCamera>` - Camera controls
- `<SceneEffects>` - Post-processing
- `<SceneListeners>` - Input handling
- `<Pillar>` - Content display (passed as children)

### SceneCamera.tsx

**What it does:** Manages camera positioning and controls.

**Key responsibilities:**
- Camera movement and rotation
- Auto-framing active content via `fitToBox()`
- Freelook mode (optional manual control)
- Smooth camera transitions

**Features:**
- **Auto-positioning**: Zooms to active content item
- **Freelook toggle**: Enable/disable manual camera control
- **Smooth animations**: Gradual camera movements

### SceneEffects.tsx

**What it does:** Post-processing visual effects.

**Key responsibilities:**
- Bloom, vignette, depth of field, etc.
- Performance-optimized effect pipeline
- Configurable effect parameters

### SceneListeners.tsx

**What it does:** Handles keyboard and input events.

**Key responsibilities:**
- Keyboard navigation (arrow keys)
- Custom input bindings
- Event propagation to stores

### store.tsx

**What it does:** Zustand store for scene state.

**Key state:**
- Canvas dimensions
- Camera position/rotation
- Active effects settings

**Key methods:**
- `fitToBox(bounds)` - Position camera to frame content
- `updateCanvasSize(width, height)` - Handle resize

## Camera System

### Auto-Framing

When user navigates to new content, camera automatically frames it:

```typescript
// Get content bounding box
const bounds = calculateBounds(activeContent)

// Position camera to frame it
sceneStore.fitToBox(bounds)
```

### Freelook Mode

Optional manual camera control:
- **Disabled** (default): Camera auto-positions to content
- **Enabled**: User can freely move camera with mouse/touch

Toggle in settings panel.

## Input Handling

### Keyboard Navigation

Handled by `SceneListeners.tsx`:

- **←** Left arrow: Previous category
- **→** Right arrow: Next category
- **↑** Up arrow: Previous item in category
- **↓** Down arrow: Next item in category

Events are forwarded to `contentStore` actions.

### Swipe Gestures

Mobile gesture support via `SwipeDetector` (in `/viewer/common/`):
- Swipe left/right: Navigate categories
- Swipe up/down: Navigate items

## Effects Pipeline

Post-processing effects applied in order:

```
3D Scene → Render
    ↓
  Bloom → Adds glow
    ↓
Vignette → Darkens edges
    ↓
   SSAO → Ambient occlusion
    ↓
  Final Output
```

Effects can be toggled in settings panel.

## Performance Considerations

### Render Optimization
- Uses `@react-three/fiber` for efficient React reconciliation
- Only re-renders when state changes
- Hardware-accelerated via WebGL

### Effect Performance
- Effects can be disabled for better performance
- Configurable quality settings
- Automatic quality adjustment based on FPS (future)

## Common Patterns

### Accessing Scene State

```typescript
import { useSceneStore } from '@/viewer/scene/store'

function MyComponent() {
  const canvasSize = useSceneStore(s => s.canvasSize)
  const fitToBox = useSceneStore(s => s.fitToBox)

  // Use fitToBox to frame content
  useEffect(() => {
    fitToBox(bounds)
  }, [activeContent])
}
```

### Adding Custom Effects

```typescript
// SceneEffects.tsx
import { EffectComposer, Bloom } from '@react-three/postprocessing'

<EffectComposer>
  <Bloom intensity={1.5} />
  {/* Add new effect here */}
</EffectComposer>
```

## Troubleshooting

### Black Screen
- Check canvas is mounted
- Verify camera position is not inside object
- Check lighting is present

### Camera Not Moving
- Verify `fitToBox()` is being called
- Check camera controls are not locked
- Ensure freelook mode is disabled if auto-framing expected

### Poor Performance
- Disable post-processing effects
- Reduce effect quality settings
- Check for excessive re-renders

## Dependencies

- **@react-three/fiber** - React renderer for Three.js
- **@react-three/drei** - Useful helpers (CameraControls, etc.)
- **@react-three/postprocessing** - Effect pipeline
- **three** - 3D graphics library
- **zustand** - State management

## Related Documentation

- `/viewer/ARCHITECTURE.md` - Overall system architecture
- `/viewer/pillar/README.md` - Content display system
- `/viewer/ui/README.md` - User interface
