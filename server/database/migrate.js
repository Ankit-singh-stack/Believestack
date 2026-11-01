import { assertDatabaseConfig, closeDatabase, testConnection } from '../src/config/db.js';
const getErrorMessage = (error) => (error instanceof Error ? error.message : String(error));

try {
  assertDatabaseConfig();
  await testConnection();
  console.log('MongoDB connection and indexes initialized successfully.');
} catch (error) {
  console.error(`MongoDB initialization failed: ${getErrorMessage(error)}`);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
