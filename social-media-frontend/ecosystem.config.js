module.exports = {
  apps: [
    {
      name: 'social-media-frontend',
      script: 'serve',
      args: '-s dist -l 3000',
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
