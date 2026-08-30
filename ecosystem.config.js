module.exports = {
  apps: [
    {
      name: 'mcoc-youtube-uploader',
      script: './src/index.js',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
