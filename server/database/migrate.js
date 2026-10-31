import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pool, { assertDatabaseConfig, closePool } from '../src/config/db.js';

const schemaPath = resolve(dirname(fileURLToPath(import.meta.url)), 'schema.sql');
const getErrorMessage = (error) => (error instanceof Error ? error.message : String(error));

try {
  assertDatabaseConfig();
  const schema = await readFile(schemaPath, 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(schema);
    await client.query('COMMIT');
    console.log('Database schema initialized successfully.');
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error(`Database migration rollback failed: ${getErrorMessage(rollbackError)}`);
    }
    throw error;
  } finally {
    client.release();
  }
} catch (error) {
  console.error(`Database migration failed: ${getErrorMessage(error)}`);
  process.exitCode = 1;
} finally {
  await closePool();
}
