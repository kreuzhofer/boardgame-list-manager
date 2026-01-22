/**
 * Jest setup file for database tests
 * Sets up environment variables before Prisma client is initialized
 */
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Construct DATABASE_URL if not already set
if (!process.env.DATABASE_URL) {
  const dbPassword = process.env.DB_PASSWORD || 'postgres';
  const dbPort = process.env.DB_PORT || '5456';
  const dbName = process.env.DB_NAME || 'boardgame_event';
  process.env.DATABASE_URL = `postgresql://postgres:${dbPassword}@localhost:${dbPort}/${dbName}`;
}
