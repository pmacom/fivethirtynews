# Audio - Audio Features

## Purpose

The **audio** directory contains audio visualization and processing features, including frequency analysis, audio device selection, and reactive visual effects.

## Why It Exists

Audio features enhance the viewing experience by:
- Visualizing audio frequency data in 3D space
- Providing audio device selection
- Creating reactive visual effects synchronized to audio
- Supporting audio playback for video content

## Important Components

### Audio Listener

**What it does:** Main audio context manager.

**Key responsibilities:**
- Sets up Web Audio API context
- Manages audio input/output
- Provides audio stream to visualizations
- Handles device selection

### Audio Visualization

**What it does:** Creates visual representations of audio data.

**Features:**
- Frequency spectrum analysis
- Waveform display
- Reactive 3D objects (spheres, particles, etc.)
- Synchronized to audio playback

### Frequency Analysis

**What it does:** Analyzes audio frequencies for visualization.

**Key responsibilities:**
- FFT (Fast Fourier Transform) analysis
- Frequency band extraction
- Beat detection
- Volume normalization

## Common Use Cases

### Audio-Reactive Models

Models in `/viewer/models/` can react to audio:

```typescript
import { useAudioData } from '@/viewer/audio/hooks'

function AudioReactiveSphere() {
  const { frequencies, volume } = useAudioData()

  const scale = 1 + (volume * 0.5)

  return <mesh scale={scale}>
    {/* Sphere grows with audio volume */}
  </mesh>
}
```

### Device Selection

Users can select audio input device via settings panel.

## Dependencies

- **Web Audio API** - Browser audio processing
- **@react-three/fiber** - For 3D audio visualizations
- **three** - 3D graphics

## Related Documentation

- `/viewer/ARCHITECTURE.md` - Overall system architecture
- `/viewer/models/README.md` - 3D models that use audio data
- `/viewer/ui/README.md` - Audio settings UI
