# WTF Directory Rename Plan

## Naming Convention Standards

### PascalCase for Feature/Component Directories
Component-focused directories that contain React components should use PascalCase.
Examples: `Audio`, `Content`, `Scene`, `Pillar`

### camelCase for Utility/Config Directories
Directories containing utilities, stores, or configuration should use camelCase.
Examples: `utils`, `stores`, `common`, `config`

## Proposed Directory Renames

### Current → New

**Feature Directories (PascalCase):**
- `audio/` → `Audio/`
- `content/` → `Content/`
- `details/` → `Details/`
- `info/` → `Info/`
- `legend/` → `Legend/`
- `models/` → `Models/`
- `pillar/` → `Pillar/`
- `scene/` → `Scene/`
- `settings/` → `Settings/`
- `ui/` → `UI/`

**Utility Directories (keep camelCase):**
- `common/` → `common/` ✓ (already correct)
- `display/` → `display/` ✓ (already correct - contains only stores)
- `utils/` → `utils/` ✓ (already correct)

## Implementation Strategy

1. **Use git mv** to preserve history
2. **Rename one directory at a time** to avoid concurrency issues
3. **Update imports after each rename**
4. **Test build after each major change**

## Order of Execution

To minimize issues, rename in this order (least to most dependencies):

1. `info/` → `Info/` (minimal dependencies)
2. `models/` → `Models/` (used by audio, scene)
3. `legend/` → `Legend/` (used by main WTF)
4. `details/` → `Details/` (used by main WTF)
5. `ui/` → `UI/` (used by main WTF)
6. `settings/` → `Settings/` (used by many features)
7. `audio/` → `Audio/` (used by scene, models)
8. `scene/` → `Scene/` (used by display, main WTF)
9. `pillar/` → `Pillar/` (used by main WTF)
10. `content/` → `Content/` (used by almost everything - do last)

## Import Pattern Updates

After each rename, update imports following these patterns:

### Before:
```typescript
import { AudioStore } from '../audio/audioStore'
import AudioListener from '@/wtf/audio/AudioListener'
import { ContentStore } from '../../content/contentStore'
```

### After:
```typescript
import { AudioStore } from '../Audio/audioStore'
import AudioListener from '@/wtf/Audio/AudioListener'
import { ContentStore } from '../../Content/contentStore'
```

## Risk Mitigation

- Test build after each rename
- Keep backups of REFACTOR_PLAN.md and other docs
- Use git to track all changes
- Can rollback individual changes if needed
