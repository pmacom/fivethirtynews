# WTF Directory Refactoring Plan

## Naming Conventions

### Modern React/TypeScript Naming Standards:
1. **Components**: PascalCase with descriptive names (e.g., `AudioListener.tsx` not `listener.tsx`)
2. **Stores**: camelCase with suffix (e.g., `audioStore.ts`, `contentStore.ts`)
3. **Hooks**: camelCase with `use` prefix (e.g., `useAudioStore.ts`, `useContentStore.ts`)
4. **Utils**: camelCase with descriptive names (e.g., `audioUtils.ts`, `contentUtils.ts`)
5. **Types**: PascalCase for interfaces/types, camelCase for files (e.g., `types.ts`, `audioTypes.ts`)
6. **CSS**: kebab-case (e.g., `audio-settings.css`) or match component name

## File Renaming Map

### Audio Module
```
audio/
├── listener.tsx                    → AudioListener.tsx
├── settings.tsx                    → AudioSettings.tsx
├── store.tsx                       → audioStore.ts
├── useAudioStore.ts                ✓ (keep)
├── types.ts                        ✓ (keep)
└── utils/
    └── audioUtils.ts               ✓ (keep)
```

### Content Module
```
content/
├── content.tsx                     → Content.tsx
├── settings.tsx                    → ContentSettings.tsx
├── store.tsx                       → contentStore.ts
├── useContentStore.ts              ✓ (keep)
├── types.ts                        ✓ (keep)
└── utils/
    └── contentUtils.ts             ✓ (keep)
```

### Details Module
```
details/
├── details.tsx                     → Details.tsx
```

### Legend Module
```
legend/
├── legend.tsx                      → Legend.tsx
├── store.tsx                       → legendStore.ts
└── useLegendStore.ts               ✓ (keep)
```

### Pillar Module
```
pillar/
├── pillar.tsx                      → Pillar.tsx
```

### Scene Module
```
scene/
├── scene.tsx                       → Scene.tsx
├── store.tsx                       → sceneStore.ts
└── useSceneStore.ts                ✓ (keep)
```

### Settings Module
```
settings/
├── settings.tsx                    → Settings.tsx
├── options.tsx                     → SettingsOptions.tsx
├── store.tsx                       → settingsStore.ts
└── useSettingsStore.ts             ✓ (keep)
```

### UI Module
```
ui/
├── ui.tsx                          → UI.tsx
├── settings.tsx                    → UISettings.tsx
├── store.tsx                       → uiStore.ts
└── useUiStore.ts                   ✓ (keep)
```

### Display Module
```
display/
├── cameraStore.tsx                 → cameraStore.ts (change extension)
├── positionStore.tsx               → positionStore.ts (change extension)
```

### Info Module
```
info/
├── info.tsx                        → Info.tsx
```

### Root
```
wtf.tsx                             → WTF.tsx (or consider WTFViewer.tsx)
config.ts                           ✓ (keep)
```

## Backup/Temporary Files to Delete

### Check for:
- `___display/` directory
- `scene copy/` directory
- `___store copy.tsx` in content/
- Any files with `copy` or `___` prefix

## Code Quality Improvements

### 1. Store Files
- Ensure consistent export pattern
- Use named exports for stores
- Add JSDoc comments
- Consolidate duplicate store hooks

### 2. Component Files
- Add proper TypeScript typing
- Use consistent prop interface naming (e.g., `AudioListenerProps`)
- Add JSDoc comments for complex components
- Remove unused imports

### 3. Import Organization
- Group imports: React → Third-party → Local
- Use index.ts files for cleaner imports
- Ensure consistent path aliases

### 4. File Structure
- Create index.ts exports where missing
- Consolidate util functions
- Remove duplicate code

## Migration Steps

1. **Phase 1**: Delete backup/temp files
2. **Phase 2**: Rename store files (*.tsx → *.ts where appropriate)
3. **Phase 3**: Rename main component files (lowercase → PascalCase)
4. **Phase 4**: Update all import statements
5. **Phase 5**: Code quality cleanup
6. **Phase 6**: Build and test

## Import Update Strategy

After renaming, update imports in this order:
1. Same-directory imports
2. Parent directory imports
3. Cross-module imports
4. External imports from other src/ directories
