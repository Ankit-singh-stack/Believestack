import app from './app.js';
import { assertDatabaseConfig, closeDatabase, testConnection } from './src/config/db.js';

const port = Number(process.env.PORT || 5000);

const start = async () => {
  assertDatabaseConfig();
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be set to a random value of at least 32 characters in server/.env.');
  }
  await testConnection();
  const server = app.listen(port, () => {
    console.log(`BELIEVE STACK server running on http://localhost:${port}`);
  });

  const shutdown = () => {
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

start().catch(async (error) => {
  console.error(`BELIEVE STACK server could not start: ${error.message}`);
  await closeDatabase();
  process.exitCode = 1;
});
