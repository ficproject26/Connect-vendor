module.exports = {
  apps: [
    {
      name: 'connect-backend',
      script: './server.js',
      cwd: './backend',
      watch: false,
      env: {
        NODE_ENV: 'development'
      }
    }
  ]
};
