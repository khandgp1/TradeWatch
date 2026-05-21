module.exports = {
  apps: [
    {
      name: 'tradewatch',
      script: 'server/src/index.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
      },
      // Restart if memory usage exceeds 500MB
      max_memory_restart: '500M',
      // Restart on crash with exponential backoff
      exp_backoff_restart_delay: 100,
    },
  ],
};
