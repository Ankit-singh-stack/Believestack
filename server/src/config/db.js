import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const serverDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: resolve(serverDirectory, '.env') });

const { Pool } = pg;

const databaseConfig = {
  DATABASE_URL: process.env.DATABASE_URL,
  PGHOST: process.env.PGHOST || process.env.DB_HOST,
  PGPORT: process.env.PGPORT || process.env.DB_PORT,
  PGDATABASE: process.env.PGDATABASE || process.env.DB_NAME,
  PGUSER: process.env.PGUSER || process.env.DB_USER,
  PGPASSWORD: process.env.PGPASSWORD || process.env.DB_PASSWORD,
};

const connectionConfig = databaseConfig.DATABASE_URL
  ? { connectionString: databaseConfig.DATABASE_URL }
  : {
    host: databaseConfig.PGHOST,
    port: databaseConfig.PGPORT ? Number(databaseConfig.PGPORT) : undefined,
    database: databaseConfig.PGDATABASE,
    user: databaseConfig.PGUSER,
    password: databaseConfig.PGPASSWORD,
  };

export const assertDatabaseConfig = () => {
  if (databaseConfig.DATABASE_URL) return;

  const missingFields = ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD']
    .filter((key) => !databaseConfig[key]);
  if (missingFields.length > 0) {
    throw new Error(`Database configuration is missing: ${missingFields.join(', ')}. Set these values in server/.env or use DATABASE_URL.`);
  }
};

const pool = new Pool({
  ...connectionConfig,
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: process.env.DB_SSL === 'true' || Boolean(databaseConfig.DATABASE_URL) ? { rejectUnauthorized: false } : false,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error.message);
});

export const testConnection = async () => pool.query('SELECT 1');
export const closePool = () => pool.end();

export default pool;
