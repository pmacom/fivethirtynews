# Common - Shared Utilities

## Purpose

The **common** directory contains shared utility components and helpers used across the viewer system.

## Why It Exists

Common utilities prevent code duplication and provide reusable functionality that doesn't fit into other specific directories.

## Important Files

### BehaviorDetection.tsx

**What it does:** Wrapper component that detects and responds to user behavior patterns.

**Key responsibilities:**
- Detects user activity vs inactivity
- Triggers events based on behavior
- Manages activity timers
- Provides context to children

**Usage:**
```typescript
<BehaviorDetection onInactive={handleInactive} onActive={handleActive}>
  {children}
</BehaviorDetection>
```

### KeyListener.tsx

**What it does:** Global keyboard event listener.

**Key responsibilities:**
- Listens for keyboard events
- Filters and routes key presses
- Prevents default browser behavior when needed
- Provides keyboard shortcuts

**Supported keys:**
- Arrow keys (navigation)
- Space (play/pause)
- Escape (close panels)
- Custom bindings

### SwipeDetector.tsx

**What it does:** Touch gesture detection for mobile devices.

**Key responsibilities:**
- Detects swipe gestures (left, right, up, down)
- Calculates swipe velocity and distance
- Filters accidental touches
- Triggers navigation actions

**Events:**
- `onSwipeLeft` - Navigate to next category
- `onSwipeRight` - Navigate to previous category
- `onSwipeUp` - Navigate to next item
- `onSwipeDown` - Navigate to previous item

## Common Patterns

### Using KeyListener

```typescript
import { KeyListener } from '@/viewer/common/KeyListener'

function MyComponent() {
  return (
    <KeyListener
      onKeyPress={(key) => {
        if (key === 'Escape') {
          closePanel()
        }
      }}
    >
      {children}
    </KeyListener>
  )
}
```

### Using SwipeDetector

```typescript
import { SwipeDetector } from '@/viewer/common/SwipeDetector'

function MyComponent() {
  return (
    <SwipeDetector
      onSwipeLeft={() => setNextColumn()}
      onSwipeRight={() => setPrevColumn()}
    >
      {children}
    </SwipeDetector>
  )
}
```

### Using BehaviorDetection

```typescript
import { BehaviorDetection } from '@/viewer/common/BehaviorDetection'

function MyComponent() {
  return (
    <BehaviorDetection
      inactivityDelay={3000}
      onInactive={() => console.log('User inactive')}
      onActive={() => console.log('User active')}
    >
      {children}
    </BehaviorDetection>
  )
}
```

## Adding New Utilities

To add a new shared utility:

1. Create file in `common/`
2. Export from `common/index.ts` if needed
3. Document usage in this README
4. Use across multiple components

**Guidelines:**
- Keep utilities generic and reusable
- Avoid component-specific logic
- Add TypeScript types
- Include usage examples

## Dependencies

- **React** - Component framework
- Minimal external dependencies (utilities should be lightweight)

## Related Documentation

- `/viewer/ARCHITECTURE.md` - Overall system architecture
- `/viewer/ui/README.md` - UI components that use these utilities
- `/viewer/scene/README.md` - Scene components that use listeners
