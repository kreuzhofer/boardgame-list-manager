import express from 'express';
import cors from 'cors';
import * as path from 'path';
import authRoutes from './routes/auth.routes';
import bggRoutes from './routes/bgg.routes';
import gameRoutes from './routes/game.routes';
import sseRoutes from './routes/sse.routes';
import statisticsRoutes from './routes/statistics.routes';
import userRoutes from './routes/user.routes';
import { bggCache } from './services';
import { config } from './config';

const app = express();
const PORT = config.server.port;

// Middleware
// CORS configuration - uses CORS_ORIGIN from env, supports comma-separated origins
const corsOrigins = config.server.corsOrigin.split(',').map(o => o.trim());
app.use(cors({
  origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
  credentials: true,
}));
app.use(express.json());

// Request logging for debugging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url} from ${req.headers.origin || 'no-origin'}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bgg', bggRoutes);
app.use('/api/events', sseRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize BGG cache at startup
const initializeBggCache = async () => {
  const csvPath = path.join(__dirname, '..', 'data', 'boardgames_ranks.csv');
  console.log(`Loading BGG data from: ${csvPath}`);
  await bggCache.initialize(csvPath);
};

// Start server
initializeBggCache().then(() => {
  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to initialize BGG cache:', error);
  // Start server anyway - graceful degradation
  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT} (BGG cache failed to load)`);
  });
});


export default app;
