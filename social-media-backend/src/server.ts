import { connectDB } from './config/db';
import { env } from './config/env';
import app from './app';

const start = async () => {
  await connectDB();
  app.listen(env.PORT, () => {
    console.log(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    console.log(`Swagger docs: http://localhost:${env.PORT}/api-docs`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
