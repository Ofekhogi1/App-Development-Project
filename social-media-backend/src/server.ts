import https from 'https';
import fs from 'fs';
import { connectDB } from './config/db';
import { env } from './config/env';
import app from './app';

const start = async () => {
  await connectDB();

  if (env.isProd && env.SSL_CERT && env.SSL_KEY) {
    const options = {
      cert: fs.readFileSync(env.SSL_CERT),
      key: fs.readFileSync(env.SSL_KEY),
    };
    https.createServer(options, app).listen(env.PORT, () => {
      console.log(`Server running in ${env.NODE_ENV} mode on port ${env.PORT} (HTTPS)`);
      console.log(`Swagger docs: https://localhost:${env.PORT}/api-docs`);
    });
  } else {
    app.listen(env.PORT, () => {
      console.log(`Server running in ${env.NODE_ENV} mode on port ${env.PORT} (HTTP)`);
      console.log(`Swagger docs: http://localhost:${env.PORT}/api-docs`);
    });
  }
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
