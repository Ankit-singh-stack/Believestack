import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const serverDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: resolve(serverDirectory, '.env') });

const { Pool } = pg;

const databaseConfig = {
  PGHOST: process.env.PGHOST || process.env.DB_HOST,
  PGPORT: process.env.PGPORT || process.env.DB_PORT,
  PGDATABASE: process.env.PGDATABASE || process.env.DB_NAME,
  PGUSER: process.env.PGUSER || process.env.DB_USER,
  PGPASSWORD: process.env.PGPASSWORD || process.env.DB_PASSWORD,
};

const connectionConfig = {
  host: databaseConfig.PGHOST,
  port: databaseConfig.PGPORT ? Number(databaseConfig.PGPORT) : undefined,
  database: databaseConfig.PGDATABASE,
  user: databaseConfig.PGUSER,
  password: databaseConfig.PGPASSWORD,
};

export const assertDatabaseConfig = () => {
  const missingFields = ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD']
    .filter((key) => !databaseConfig[key]);
  if (missingFields.length > 0) {
    throw new Error(`Database configuration is missing: ${missingFields.join(', ')}. Set these values in server/.env.`);
  }
};

const pool = new Pool({
  ...connectionConfig,
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error.message);
});

export const testConnection = async () => pool.query('SELECT 1');
export const closePool = () => pool.end();

export default pool;
