import dotenv from 'dotenv';
import path from 'path';

// Load from root .env for local development
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
// Also try local .env if exists
dotenv.config();

export const config = {
  database: {
    url: process.env.DATABASE_URL || `postgresql://postgres:${process.env.DB_PASSWORD || 'postgres'}@localhost:${process.env.DB_PORT || '5456'}/${process.env.DB_NAME || 'boardgame_event'}`,
  },
  auth: {
    eventPassword: process.env.EVENT_PASSWORD || 'default-password',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'development-jwt-secret-change-in-production',
    expiresIn: '7d',
  },
  event: {
    name: process.env.EVENT_NAME || 'Brettspiel-Event',
  },
  server: {
    port: parseInt(process.env.API_PORT || '3006', 10),
    corsOrigin: process.env.CORS_ORIGIN || `http://localhost:${process.env.FRONTEND_PORT || '8086'}`,
  },
  bggImages: {
    scraperApiKey: process.env.SCRAPER_API_KEY || '',
    scrapeEnabled: process.env.BGG_SCRAPE_ENABLED !== 'false',
    cacheDir: process.env.BGG_IMAGE_CACHE_DIR || '/app/cache/bgg-images',
  },
};
