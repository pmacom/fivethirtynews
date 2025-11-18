# Models - 3D Models

## Purpose

The **models** directory contains 3D model components that appear in the scene, including logos, background elements, and decorative objects.

## Why It Exists

Models add visual interest and branding to the 3D environment. They can be static or animated, and may react to user interaction or audio.

## Important Files

### Logo530

**What it does:** Displays the branded logo in 3D space.

**Features:**
- 3D logo model
- Optional animations (rotation, floating, etc.)
- Positioned in scene for visibility

### AudioResponsiveSphere

**What it does:** 3D sphere that reacts to audio frequencies.

**Features:**
- Scales with audio volume
- Color changes based on frequency bands
- Smooth animations synchronized to audio

### BackgroundScene

**What it does:** Background environment elements.

**Features:**
- Skybox or environment map
- Ambient lighting
- Background geometry (grid, particles, etc.)

### Web

**What it does:** Decorative web/network visualization.

**Features:**
- Interconnected nodes
- Dynamic connections
- Optional interactivity

## Common Patterns

### Loading 3D Models

```typescript
import { useGLTF } from '@react-three/drei'

function MyModel() {
  const { scene } = useGLTF('/models/my-model.glb')

  return <primitive object={scene} />
}
```

### Audio Reactivity

```typescript
import { useAudioData } from '@/viewer/audio/hooks'

function AudioReactiveModel() {
  const { volume } = useAudioData()

  return (
    <mesh scale={1 + volume}>
      <sphereGeometry />
      <meshStandardMaterial />
    </mesh>
  )
}
```

### Adding New Models

1. Place model file in `/public/models/`
2. Create component in `models/`
3. Import and use in scene or viewer component

## Performance Considerations

- **Model Complexity**: Keep polygon count reasonable
- **Texture Size**: Optimize texture resolution
- **Instance Reuse**: Reuse geometries and materials
- **LOD**: Use level-of-detail for complex models

## Dependencies

- **@react-three/fiber** - React renderer for Three.js
- **@react-three/drei** - Model loading helpers (useGLTF, etc.)
- **three** - 3D graphics library

## Related Documentation

- `/viewer/ARCHITECTURE.md` - Overall system architecture
- `/viewer/scene/README.md` - 3D environment
- `/viewer/audio/README.md` - Audio reactivity
