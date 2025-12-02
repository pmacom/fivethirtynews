# Branding Configuration Guide

**Version**: 1.0
**Last Updated**: 2025-10-10
**Purpose**: Single source of truth for project naming and branding

---

## Current Brand Identity

**Full Name**: `530societynews`
**Short Name**: `530`
**Button Text**: `530`
**Tagline**: `Community-curated news discovery`

---

## Philosophy

The name "530societynews" is **temporary and easily changeable**. All branding elements are centralized in a single configuration file to enable:
- Quick name changes as the project evolves
- Consistent branding across all components
- No hardcoded strings scattered throughout codebase

**Design Principle**: Change once, rebuild, done.

---

## Configuration File Location

**Primary Config**: `/shared/config.ts`

This file is the **single source of truth** for all branding. Every component imports from here.

```typescript
// /shared/config.ts
export const BRAND_CONFIG = {
  // Names
  name: '530societynews',        // Full brand name
  shortName: '530',               // Abbreviated version
  buttonText: '530',              // Text shown on extension button
  tagline: 'Community-curated news discovery',

  // Colors (Tailwind CSS classes)
  colors: {
    primary: '#3B82F6',           // Blue-500
    secondary: '#10B981',         // Green-500
    accent: '#F59E0B',            // Amber-500
    danger: '#EF4444',            // Red-500
  },

  // URLs
  urls: {
    website: 'https://530societynews.com',
    api: 'https://api.530societynews.com',
    docs: 'https://docs.530societynews.com',
    github: 'https://github.com/yourusername/TwitterBotY25',
  },

  // Social
  social: {
    twitter: '@530societynews',
    email: 'contact@530societynews.com',
  },

  // Chrome Extension Metadata
  extension: {
    name: '530societynews',
    description: 'Community-curated social media tagging for meaningful content discovery',
    version: '1.0.0',
  },
} as const;

// Type-safe exports
export type BrandConfig = typeof BRAND_CONFIG;
```

---

## How to Change the Brand Name

### Step 1: Update Config File

Edit `/shared/config.ts`:

```typescript
export const BRAND_CONFIG = {
  name: 'yourNewName',           // Change this
  shortName: 'YNN',              // Change this
  buttonText: 'YNN',             // Change this
  tagline: 'Your new tagline',   // Change this
  // ... rest of config
} as const;
```

### Step 2: Update Domain References (if applicable)

If you're changing domains, update URLs in config:

```typescript
urls: {
  website: 'https://yournewname.com',
  api: 'https://api.yournewname.com',
  // ...
}
```

### Step 3: Rebuild Components

```bash
# Chrome Extension
cd extension
pnpm build

# Admin UI
cd admin-ui
pnpm build

# Rebuild Docker images (if using Docker Compose)
docker compose -f docker-compose.production.yml up -d --build
```

### Step 4: Update External References

**Manual updates required**:
1. **Domain registrar**: Update DNS records if domain changed
2. **Chrome Web Store**: Update extension listing (if published)
3. **SSL certificates**: Re-issue for new domain
4. **Environment variables**: Update `.env` files with new URLs
5. **Documentation**: Search for old name in `/docs` and update references

---

## Where Brand Config is Used

### 1. Chrome Extension

**`/extension/manifest.json`**:
```json
{
  "name": "{{BRAND_CONFIG.extension.name}}",
  "description": "{{BRAND_CONFIG.extension.description}}",
  "version": "{{BRAND_CONFIG.extension.version}}"
}
```

**Build script** (`/extension/scripts/build-manifest.ts`):
```typescript
import { BRAND_CONFIG } from '../shared/config';
import manifestTemplate from './manifest.template.json';

const manifest = {
  ...manifestTemplate,
  name: BRAND_CONFIG.extension.name,
  description: BRAND_CONFIG.extension.description,
  version: BRAND_CONFIG.extension.version,
};

fs.writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2));
```

**Content Script** (`/extension/src/content-scripts/injector.ts`):
```typescript
import { BRAND_CONFIG } from '@shared/config';

function createButton() {
  const button = document.createElement('button');
  button.textContent = BRAND_CONFIG.buttonText;  // "530"
  button.className = 'tag-button';
  button.style.backgroundColor = BRAND_CONFIG.colors.primary;
  return button;
}
```

**Popup** (`/extension/src/popup/popup.tsx`):
```tsx
import { BRAND_CONFIG } from '@shared/config';

export function Popup() {
  return (
    <div>
      <h1>{BRAND_CONFIG.name}</h1>
      <p>{BRAND_CONFIG.tagline}</p>
      <a href={BRAND_CONFIG.urls.website}>Visit Website</a>
    </div>
  );
}
```

### 2. Next.js Admin UI

**Layout** (`/admin-ui/app/layout.tsx`):
```tsx
import { BRAND_CONFIG } from '@shared/config';

export const metadata = {
  title: BRAND_CONFIG.name,
  description: BRAND_CONFIG.tagline,
};

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <title>{BRAND_CONFIG.name}</title>
      </head>
      <body>
        <Header brandName={BRAND_CONFIG.name} />
        {children}
      </body>
    </html>
  );
}
```

**Header Component** (`/admin-ui/components/Header.tsx`):
```tsx
import { BRAND_CONFIG } from '@shared/config';

export function Header() {
  return (
    <header>
      <Logo />
      <h1>{BRAND_CONFIG.name}</h1>
      <nav>
        <a href={BRAND_CONFIG.urls.docs}>Docs</a>
        <a href={BRAND_CONFIG.urls.github}>GitHub</a>
      </nav>
    </header>
  );
}
```

### 3. Supabase Configuration

**Environment Variables** (`.env.production`):
```bash
# Reference brand config values
SITE_URL=https://530societynews.com
API_EXTERNAL_URL=https://api.530societynews.com
```

**Note**: Update these manually when domain changes.

### 4. Documentation

**README.md** and other docs:
- Use `{{BRAND_CONFIG.name}}` placeholders
- Run build script to replace with actual values
- Or manually update after name change

---

## Monorepo Setup (Recommended)

To share `config.ts` across extension and admin UI, use a monorepo:

```
/TwitterBotY25
  /shared
    config.ts           # ← Single source of truth
  /extension
    package.json
    tsconfig.json       # Extend shared config
  /admin-ui
    package.json
    tsconfig.json       # Extend shared config
  package.json          # Root package.json
  pnpm-workspace.yaml   # Define workspaces
```

**`pnpm-workspace.yaml`**:
```yaml
packages:
  - 'extension'
  - 'admin-ui'
  - 'shared'
```

**`/shared/package.json`**:
```json
{
  "name": "@530/shared",
  "version": "1.0.0",
  "main": "config.ts",
  "types": "config.ts"
}
```

**Import in extension/admin**:
```typescript
import { BRAND_CONFIG } from '@530/shared';
```

---

## Logo & Visual Assets

### Logo Guidelines

**Current**: Text-only logo using "530" in bold sans-serif font

**Future**: Custom logo/icon design

**Asset Locations**:
```
/assets
  /logos
    logo.svg              # Main logo (scalable)
    logo-dark.svg         # Dark mode variant
    icon-16.png           # Extension icon (16x16)
    icon-32.png           # Extension icon (32x32)
    icon-48.png           # Extension icon (48x48)
    icon-128.png          # Extension icon (128x128)
  /screenshots
    extension-demo.png    # Chrome Web Store screenshot
```

**Generating Icons**:
```bash
# Install imagemagick
brew install imagemagick

# Generate from SVG
convert -background none -resize 16x16 logo.svg icon-16.png
convert -background none -resize 32x32 logo.svg icon-32.png
convert -background none -resize 48x48 logo.svg icon-48.png
convert -background none -resize 128x128 logo.svg icon-128.png
```

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Primary Blue | `#3B82F6` | Buttons, links, extension button |
| Secondary Green | `#10B981` | Success states, confirmation |
| Accent Amber | `#F59E0B` | Highlights, badges |
| Danger Red | `#EF4444` | Errors, delete actions |
| Neutral Gray | `#6B7280` | Text, borders |

**Tailwind CSS Variables** (`/admin-ui/tailwind.config.js`):
```javascript
import { BRAND_CONFIG } from '@530/shared';

module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          primary: BRAND_CONFIG.colors.primary,
          secondary: BRAND_CONFIG.colors.secondary,
          accent: BRAND_CONFIG.colors.accent,
          danger: BRAND_CONFIG.colors.danger,
        },
      },
    },
  },
};
```

---

## Typography

**Primary Font**: System font stack for performance
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
```

**Heading Font**: Same as primary (keep it simple for MVP)

**Button Text**: Bold, uppercase for emphasis
```css
.tag-button {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

---

## Brand Voice & Messaging

### Tone

- **Empowering**: "You curate your own internet"
- **Community-driven**: "Built by users, for users"
- **Simple**: No jargon, clear language
- **Transparent**: Open about data usage and goals

### Key Messages

1. **"Transform social media chaos into structured discovery"**
   - Problem: Information overload on social media
   - Solution: Community-curated tagging

2. **"Your tags, your hierarchy, your internet"**
   - Emphasizes user control and customization

3. **"Discover what matters through community curation"**
   - Highlights collaborative aspect

### Example Copy

**Extension Description**:
> "530 helps you organize and discover meaningful content on social media through community-curated tags. Click the '530' button to tag any post with hierarchical categories you create. Browse tagged content to find what matters most to you."

**Website Hero**:
> "Stop scrolling. Start discovering.
> Community-curated tagging for social media that actually makes sense."

---

## External Branding Checklist

When changing brand name, update:

- [ ] `/shared/config.ts` (primary source)
- [ ] Extension manifest.json (via build script)
- [ ] Admin UI metadata (page titles, meta tags)
- [ ] README.md and documentation
- [ ] Docker Compose service names (optional)
- [ ] Environment variables (.env files)
- [ ] Domain DNS records
- [ ] SSL certificates (if domain changed)
- [ ] Chrome Web Store listing (if published)
- [ ] Social media accounts (Twitter, etc.)
- [ ] Email addresses (contact@newname.com)
- [ ] GitHub repository name (optional)

---

## Testing After Brand Change

```bash
# 1. Search for old name references
cd TwitterBotY25
grep -r "530societynews" --exclude-dir=node_modules --exclude-dir=.git

# 2. Check for hardcoded strings
grep -r "530" extension/src --exclude="*.json"

# 3. Test extension button text
# - Load extension in Chrome
# - Visit X.com
# - Verify button shows new text

# 4. Test admin UI
# - Open http://localhost:3000
# - Verify header, page titles, footer show new name

# 5. Test API endpoints
curl https://api.newname.com/rest/v1/
```

---

## Future Branding Enhancements

### Phase 1: MVP (Current)
- Text-based logo ("530")
- Simple color palette
- Minimal branding

### Phase 2: Professional Branding
- Custom logo design (hire designer or use Fiverr)
- Refined color palette with accessibility testing (WCAG AA)
- Brand guidelines document
- Marketing materials (social media graphics, etc.)

### Phase 3: Brand Expansion
- Merchandise (t-shirts, stickers) if community grows
- Sponsorship/partnership branding
- Sub-brands for different platforms (530 for Twitter, 530 for Reddit, etc.)

---

## Related Documentation

- `/docs/architecture/system-overview.md` - How branding integrates with architecture
- `/docs/development/quickstart.md` - Local development with brand config
- `CLAUDE.md` - Project overview mentioning brand philosophy

---

**Remember**: The brand exists to serve the community. As your understanding of the project evolves, don't hesitate to rebrand. The infrastructure supports it!
