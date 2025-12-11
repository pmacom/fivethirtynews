import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Environment configuration
const isDev = process.env.EXT_ENV === 'development';

// Environment-specific values
// Default local port: 3530 (configurable via PORT env var)
const LOCAL_PORT = process.env.PORT || '3530';
const envConfig = {
  development: {
    API_URL: `http://localhost:${LOCAL_PORT}/api`,
    APP_URL: `http://localhost:${LOCAL_PORT}`,
    ENV_COLOR: '#8B5CF6', // Purple
  },
  production: {
    API_URL: 'https://530society.com/api',
    APP_URL: 'https://530society.com',
    ENV_COLOR: '#10B981', // Green
  },
};

const env = isDev ? envConfig.development : envConfig.production;

// Build each content script as a separate IIFE bundle with all dependencies inlined
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  build: {
    outDir: isDev ? resolve(__dirname, '../extension-dev/dist') : 'dist',
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
        // ES module format - Chrome supports ES modules in content scripts
        format: 'es',
        // Prevent code splitting - each entry should be self-contained
        manualChunks: () => 'vendor',
      },
    },
    // Don't minify for easier debugging
    minify: false,
    sourcemap: true,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    // Environment variables for extension
    __API_URL__: JSON.stringify(env.API_URL),
    __APP_URL__: JSON.stringify(env.APP_URL),
    __IS_DEV__: isDev,
    __ENV_NAME__: JSON.stringify(isDev ? 'development' : 'production'),
    __ENV_COLOR__: JSON.stringify(env.ENV_COLOR),
  },
});
