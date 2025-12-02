# WTF Directory Cleanup and Reorganization Plan

## Overview
This document outlines a comprehensive cleanup of the WTF directory to:
1. Remove duplicate code and enforce DRY principles
2. Remove temporary directories with `__` prefixes
3. Consolidate similar utilities
4. Fix ESLint warnings
5. Improve overall code organization

## Issues Identified

### 1. Duplicate Store Files (CRITICAL)
**Problem**: Each store has TWO files - old pattern vs new pattern
- `audio/audioStore.tsx` (old, 251 lines, has JSX component)
- `audio/useAudioStore.ts` (new, 259 lines, cleaner, better documented)

Same pattern for:
- `content/contentStore.ts` vs `content/useContentStore.ts`
- `settings/settingsStore.ts` vs `settings/useSettingsStore.ts`
- `scene/sceneStore.ts` vs `scene/useSceneStore.ts`
- `ui/uiStore.ts` vs `ui/useUiStore.ts`
- `legend/legendStore.ts` vs `legend/useLegendStore.ts`

**Solution**: Keep the `use*Store.ts` versions (better naming, better docs, cleaner), delete old versions

### 2. Temporary Directories to Delete
- `/src/___november copy/` (untracked)
- `/src/_november/` (untracked)
- `/src/november copy/` (untracked)
- `/src/november/` (untracked)
- `/src/wtf/___display/` (untracked)
- `/src/wtf/content/___store copy.tsx` (untracked)
- `/src/wtf/display/` (might be old/unused)

### 3. Utils Files Consolidation
**Current State**:
- `settings/utils/utils.ts` - EMPTY (1 line)
- `audio/utils/audioUtils.ts` - Audio-specific (60 lines)
- `content/utils/contentUtils.ts` - Content-specific (37 lines)

**Solution**:
- Delete empty `settings/utils/utils.ts`
- Keep domain-specific utils in their modules

### 4. Common Utilities Pattern
**Current**:
- `roundFloat()` function appears in audio utils - could be shared

**Solution**: Create `/src/wtf/utils/` for shared utilities:
- `mathUtils.ts` - roundFloat, normalize, clamp, etc.
- `typeUtils.ts` - type guards and validators

### 5. Directory Structure Issues
**Problems**:
- `display/` folder seems disconnected (only stores, no components)
- Mix of components, templates, examples in various places
- No clear separation of concerns

**Proposed Structure**:
```
src/wtf/
├── core/                    # Core functionality
│   ├── stores/              # All zustand stores
│   │   ├── useAudioStore.ts
│   │   ├── useContentStore.ts
│   │   ├── useSceneStore.ts
│   │   ├── useSettingsStore.ts
│   │   ├── useUiStore.ts
│   │   ├── useLegendStore.ts
│   │   ├── useCameraStore.ts
│   │   └── usePositionStore.ts
│   ├── types/               # Shared types
│   │   ├── audio.ts
│   │   ├── content.ts
│   │   ├── scene.ts
│   │   └── index.ts
│   └── utils/               # Shared utilities
│       ├── mathUtils.ts
│       └── typeUtils.ts
├── features/                # Feature modules
│   ├── audio/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── AudioListener.tsx
│   │   └── AudioSettings.tsx
│   ├── content/
│   │   ├── components/
│   │   ├── utils/
│   │   ├── Content.tsx
│   │   └── ContentSettings.tsx
│   ├── scene/
│   │   ├── components/
│   │   ├── Scene.tsx
│   │   └── SceneCamera.tsx
│   ├── pillar/
│   │   ├── components/
│   │   ├── templates/
│   │   └── Pillar.tsx
│   ├── legend/
│   ├── details/
│   ├── info/
│   └── settings/
├── ui/                      # UI layer
│   ├── components/
│   └── UI.tsx
├── models/                  # 3D models
├── common/                  # Common behaviors
│   ├── BehaviorDetection.tsx
│   ├── SwipeDetector.tsx
│   ├── KeyListener.tsx
│   └── DeviceDetection.tsx
├── config.ts
└── WTF.tsx
```

## Implementation Plan

### Phase 1: Cleanup (Delete & Remove)
1. ✅ Delete temporary directories
2. ✅ Remove duplicate store files (keep use*Store versions)
3. ✅ Delete empty utils files
4. ✅ Clean up git status

### Phase 2: Consolidation (DRY)
1. Create shared utils directory
2. Move shared utilities (roundFloat, etc.)
3. Consolidate duplicate type definitions
4. Update imports

### Phase 3: Reorganization
1. Create new directory structure
2. Move stores to core/stores/
3. Move types to core/types/
4. Move features to features/
5. Update all imports

### Phase 4: Code Quality
1. Fix ESLint warnings:
   - Add alt props to images
   - Fix useEffect dependency arrays
   - Fix useCallback/useMemo dependencies
2. Add proper TypeScript types where missing
3. Remove console.logs or make them conditional

### Phase 5: Testing
1. Run build
2. Test functionality
3. Fix any broken imports
4. Verify everything works

## ESLint Warnings to Fix

### Missing Alt Props (High Priority)
- Multiple files in tweet3d/, content/view/, fivethirty/

### React Hook Dependencies (Medium Priority)
- Missing dependencies in useEffect/useCallback/useMemo
- Unnecessary dependencies

### Image Optimization (Low Priority)
- Replace <img> with Next.js <Image> where appropriate

## Benefits

1. **DRY**: No duplicate code, single source of truth
2. **Clarity**: Clear structure, easy to navigate
3. **Maintainability**: Easier to update and refactor
4. **Type Safety**: Better TypeScript support
5. **Performance**: Cleaner code, less bloat
6. **Standards**: Follows React/Next.js best practices
