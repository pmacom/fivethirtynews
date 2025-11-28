import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Build each content script as a separate IIFE bundle with all dependencies inlined
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyDirBeforeWrite: true,
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content.tsx'),
        'content-youtube': resolve(__dirname, 'src/content-youtube.tsx'),
        'content-reddit': resolve(__dirname, 'src/content-reddit.tsx'),
        'content-bluesky': resolve(__dirname, 'src/content-bluesky.tsx'),
      },
      output: {
        entryFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        // IIFE format - self-contained, no imports needed
        format: 'iife',
        // Inline all dynamic imports
        inlineDynamicImports: false,
      },
    },
    // Don't minify for easier debugging
    minify: false,
    sourcemap: true,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});
