import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const serverDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: resolve(serverDirectory, '.env') });

const uri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB || 'believestack';
let client;
let database;
let connectionPromise;

export const assertDatabaseConfig = () => {
  if (!uri) throw new Error('Database configuration is missing: MONGODB_URI. Set it in server/.env.');
};

export const connectDatabase = async () => {
  assertDatabaseConfig();
  if (database) return database;
  if (!connectionPromise) {
    connectionPromise = (async () => {
      client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
      await client.connect();
      database = client.db(databaseName);
      await database.command({ ping: 1 });
      await Promise.all([
        database.collection('admins').createIndex({ email: 1 }, { unique: true }),
        database.collection('project_categories').createIndex({ name: 1 }, { unique: true }),
        database.collection('project_categories').createIndex({ slug: 1 }, { unique: true }),
        database.collection('projects').createIndex({ slug: 1 }, { unique: true }),
        database.collection('site_settings').createIndex({ key: 1 }, { unique: true }),
      ]);
      return database;
    })().catch((error) => {
      client = undefined;
      database = undefined;
      connectionPromise = undefined;
      throw error;
    });
  }
  return connectionPromise;
};

export const getCollection = (name) => {
  if (!database) throw new Error('Database is not connected. Connect to MongoDB before accessing collections.');
  return database.collection(name);
};

export const testConnection = async () => {
  await connectDatabase();
};

export const closeDatabase = async () => {
  if (client) await client.close();
  client = undefined;
  database = undefined;
  connectionPromise = undefined;
};
