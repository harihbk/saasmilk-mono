module.exports = {
  apps: [
    {
      name: 'milk-company-backend',
      script: './api/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 8000
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
    },
    {
      name: 'milk-company-frontend',
      script: 'npx',
      args: 'serve -s build -p 3000',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      autorestart: true,
      watch: false
    }
  ],

  deploy: {
    production: {
      user: process.env.SERVER_USERNAME,
      host: process.env.SERVER_HOST,
      ref: 'origin/main',
      repo: 'git@github.com:your-username/milk-company.git',
      path: '/home/username/milk-company',
      'post-deploy': 'npm install && cd api && npm install && cd .. && npm run build && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};