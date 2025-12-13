module.exports = {
  apps: [{
    name: '530news',
    script: 'npm',
    args: 'run start -- -p 3000',
    cwd: '/root/fivethirty',
    env: {
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_URL: 'https://530society.com',
      NEXT_PUBLIC_SITE_URL: 'https://530society.com',
      BOT_URL:'https://bot.530society.com',
      DISCORD_REDIRECT_URI:'https://530society.com/api/auth/discord/callback',
    },
    env_file: '.env.production',
    instances: 1,
    exec_mode: 'cluster',
    autorestart: true,
    max_memory_restart: '1G',
  }]
}