#!/usr/bin/env node
/**
 * Generate environment-specific manifest.json
 *
 * Usage:
 *   EXT_ENV=development node generate-manifest.js  → extension-dev/manifest.json
 *   EXT_ENV=production node generate-manifest.js   → extension/manifest.json (updates in place)
 */

const fs = require('fs');
const path = require('path');

const isDev = process.env.EXT_ENV === 'development';

// Read base manifest
const baseManifestPath = path.join(__dirname, '..', 'manifest.json');
const baseManifest = JSON.parse(fs.readFileSync(baseManifestPath, 'utf8'));

// Environment-specific configuration
const envConfig = {
  development: {
    name: '530 News (DEV)',
    description: '[DEVELOPMENT] Collaboratively tag and organize social media content',
    // Dev needs localhost permissions (already in base)
    additionalHostPermissions: [],
    iconPrefix: 'icon-dev', // Use purple icons
  },
  production: {
    name: '530 News',
    description: 'Collaboratively tag and organize social media content',
    // Production needs the production server
    additionalHostPermissions: [
      'https://530society.com/*',
      'https://*.530society.com/*',
    ],
    iconPrefix: 'icon', // Use standard icons
  },
};

const config = isDev ? envConfig.development : envConfig.production;

// Build the manifest
const manifest = {
  ...baseManifest,
  name: config.name,
  description: config.description,
  host_permissions: [
    ...baseManifest.host_permissions,
    ...config.additionalHostPermissions,
  ],
};

// Update icon references if using dev icons
if (isDev) {
  manifest.action = {
    ...manifest.action,
    default_icon: {
      '16': 'icons/icon-dev16.png',
      '48': 'icons/icon-dev48.png',
      '128': 'icons/icon-dev128.png',
    },
  };
  manifest.icons = {
    '16': 'icons/icon-dev16.png',
    '48': 'icons/icon-dev48.png',
    '128': 'icons/icon-dev128.png',
  };
}

// Determine output path
const outputDir = isDev
  ? path.join(__dirname, '..', '..', 'extension-dev')
  : path.join(__dirname, '..');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write manifest
const outputPath = path.join(outputDir, 'manifest.json');
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

console.log(`✓ Generated ${isDev ? 'development' : 'production'} manifest: ${outputPath}`);

// Environment values for replacement
const envValues = {
  development: {
    API_URL: 'http://localhost:3000/api',
    APP_URL: 'http://localhost:3000',
    IS_DEV: 'true',
    ENV_NAME: 'development',
    ENV_COLOR: '#8B5CF6', // Purple
  },
  production: {
    API_URL: 'https://530society.com/api',
    APP_URL: 'https://530society.com',
    IS_DEV: 'false',
    ENV_NAME: 'production',
    ENV_COLOR: '#10B981', // Green
  },
};

const currentEnv = isDev ? envValues.development : envValues.production;

// Function to replace environment placeholders in file content
function replaceEnvPlaceholders(content) {
  return content
    .replace(/%%API_URL%%/g, currentEnv.API_URL)
    .replace(/%%APP_URL%%/g, currentEnv.APP_URL)
    .replace(/%%IS_DEV%%/g, currentEnv.IS_DEV)
    .replace(/%%ENV_NAME%%/g, currentEnv.ENV_NAME)
    .replace(/%%ENV_COLOR%%/g, currentEnv.ENV_COLOR);
}

// Copy and process files for the target environment
const filesToCopy = ['popup.js', 'styles.css'];
const filesToProcess = ['background.js', 'popup.html']; // These need env replacement
const iconDir = path.join(__dirname, '..', 'icons');
const destIconDir = path.join(outputDir, 'icons');

// Create icons directory
if (!fs.existsSync(destIconDir)) {
  fs.mkdirSync(destIconDir, { recursive: true });
}

// Copy static files (no processing needed)
for (const file of filesToCopy) {
  const srcPath = path.join(__dirname, '..', file);
  const destPath = path.join(outputDir, file);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`  Copied: ${file}`);
  }
}

// Process files with environment replacement
for (const file of filesToProcess) {
  const srcPath = path.join(__dirname, '..', file);
  const destPath = path.join(outputDir, file);
  if (fs.existsSync(srcPath)) {
    let content = fs.readFileSync(srcPath, 'utf8');
    content = replaceEnvPlaceholders(content);
    fs.writeFileSync(destPath, content);
    console.log(`  Processed: ${file}`);
  }
}

// Copy icons (both regular and dev versions if they exist)
if (fs.existsSync(iconDir)) {
  const icons = fs.readdirSync(iconDir);
  for (const icon of icons) {
    fs.copyFileSync(
      path.join(iconDir, icon),
      path.join(destIconDir, icon)
    );
  }
  console.log(`  Copied: ${icons.length} icons`);
}

console.log(`\n✓ Build complete for ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'}`);
if (isDev) {
  console.log(`\nTo load the dev extension:`);
  console.log(`  1. Go to chrome://extensions`);
  console.log(`  2. Enable "Developer mode"`);
  console.log(`  3. Click "Load unpacked"`);
  console.log(`  4. Select: extension-dev/`);
}
