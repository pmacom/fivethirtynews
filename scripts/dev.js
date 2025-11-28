#!/usr/bin/env node

/**
 * Cross-platform development script
 * Replaces dev.sh for Windows compatibility
 *
 * Functionality:
 * 1. Check if Supabase is running
 * 2. Start Supabase if needed
 * 3. Display connection info
 * 4. Start Next.js with Turbopack
 * 5. Handle Ctrl+C cleanup
 */

const { spawn } = require('child_process');

// ANSI color codes (cross-platform)
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[0;32m',
  yellow: '\x1b[0;33m',
  red: '\x1b[0;31m',
  cyan: '\x1b[0;36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(emoji, message, color = 'green') {
  log(`\n${emoji} ${message}`, color);
}

// Check if Supabase is running
function checkSupabase() {
  logSection('🚀', 'Starting FiveThirty Development Environment');

  const check = spawn('supabase', ['status'], { shell: true });

  let stdout = '';
  let stderr = '';

  check.stdout?.on('data', (data) => {
    stdout += data.toString();
  });

  check.stderr?.on('data', (data) => {
    stderr += data.toString();
  });

  check.on('exit', (code) => {
    if (code === 0) {
      logSection('✓', 'Supabase is already running');
      displayStatus();
      startNextjs();
    } else {
      startSupabase();
    }
  });

  check.on('error', (err) => {
    log('✗ Supabase CLI not found or not in PATH', 'red');
    log('  Please install: https://supabase.com/docs/guides/cli', 'yellow');
    process.exit(1);
  });
}

// Start Supabase
function startSupabase() {
  logSection('📦', 'Starting Supabase...', 'yellow');

  const supabase = spawn('supabase', ['start'], {
    shell: true,
    stdio: 'inherit'
  });

  supabase.on('exit', (code) => {
    if (code === 0) {
      logSection('✓', 'Supabase started successfully');
      displayStatus();
      startNextjs();
    } else {
      log('✗ Failed to start Supabase', 'red');
      log('  Check Docker is running and try again', 'yellow');
      process.exit(1);
    }
  });

  supabase.on('error', (err) => {
    log('✗ Failed to spawn Supabase process', 'red');
    log(`  Error: ${err.message}`, 'yellow');
    process.exit(1);
  });
}

// Display Supabase connection info
function displayStatus() {
  logSection('📊', 'Supabase Status:', 'cyan');

  const status = spawn('supabase', ['status'], {
    shell: true,
    stdio: 'inherit'
  });

  status.on('exit', () => {
    // Continue after displaying status
  });
}

// Start Next.js development server
function startNextjs() {
  logSection('🌐', 'Starting Next.js...');

  const next = spawn('next', ['dev', '--turbopack'], {
    shell: true,
    stdio: 'inherit'
  });

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    log('\n🛑 Shutting down development server...', 'yellow');
    next.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    log('\n🛑 Shutting down development server...', 'yellow');
    next.kill('SIGTERM');
    process.exit(0);
  });

  next.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      log(`\n✗ Next.js exited with code ${code}`, 'red');
      process.exit(code);
    }
    process.exit(0);
  });

  next.on('error', (err) => {
    log('✗ Failed to start Next.js', 'red');
    log(`  Error: ${err.message}`, 'yellow');
    log('  Make sure dependencies are installed: pnpm install', 'yellow');
    process.exit(1);
  });
}

// Start the development environment
checkSupabase();
