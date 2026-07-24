// PM2 进程配置：在 VPS 上用 `pm2 start ecosystem.config.js` 启动
module.exports = {
  apps: [
    {
      name: 'todollar',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
