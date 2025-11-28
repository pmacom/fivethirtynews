// Build script for Chrome extension content scripts
// Builds each content script as a separate IIFE bundle

import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { rmSync, mkdirSync, existsSync, renameSync, readdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const entries = [
  { name: 'content', input: 'src/content.tsx' },
  { name: 'content-youtube', input: 'src/content-youtube.tsx' },
  { name: 'content-reddit', input: 'src/content-reddit.tsx' },
  { name: 'content-bluesky', input: 'src/content-bluesky.tsx' },
];

async function buildAll() {
  // Clean dist folder
  const distPath = resolve(__dirname, 'dist');
  if (existsSync(distPath)) {
    rmSync(distPath, { recursive: true });
  }
  mkdirSync(distPath);

  console.log('Building content scripts as IIFE bundles...\n');

  for (const entry of entries) {
    console.log(`Building ${entry.name}...`);

    // Build to a temp folder for this entry
    const tempDir = resolve(__dirname, `.temp-${entry.name}`);

    await build({
      configFile: false, // Don't use vite.config.ts
      root: __dirname,
      plugins: [react()],
      build: {
        outDir: tempDir,
        emptyDirBeforeWrite: true,
        rollupOptions: {
          input: resolve(__dirname, entry.input),
          output: {
            format: 'iife',
            name: entry.name.replace(/-/g, '_'),
            entryFileNames: `${entry.name}.js`,
            inlineDynamicImports: true,
          },
        },
        minify: false,
        sourcemap: true,
      },
      define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
      },
      logLevel: 'warn',
    });

    // Move files from temp to dist
    const files = readdirSync(tempDir);
    for (const file of files) {
      renameSync(resolve(tempDir, file), resolve(distPath, file));
    }
    rmSync(tempDir, { recursive: true });

    console.log(`  ✓ ${entry.name}.js built\n`);
  }

  console.log('All content scripts built successfully!');
}

buildAll().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
