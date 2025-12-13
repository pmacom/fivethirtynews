const dotenv = require('dotenv');
const path = require('path');

// Load .env.production
dotenv.config({ path: path.join(__dirname, '.env.production') });

module.exports = {
  apps: [{
    name: '530news',
    script: 'npm',
    args: 'run start -- -p 3000',
    cwd: '/root/fivethirty',
    env: {
        ...process.env,
        NODE_ENV: 'production',
    },
    env_file: '.env.production',
    instances: 1,
    exec_mode: 'cluster',
    autorestart: true,
    max_memory_restart: '1G',
  }]
}
