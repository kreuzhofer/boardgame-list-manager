import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import gameRoutes from './routes/game.routes';
import statisticsRoutes from './routes/statistics.routes';
import userRoutes from './routes/user.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
// CORS configuration - permissive for local network access
app.use(cors());
app.use(express.json());

// Request logging for debugging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url} from ${req.headers.origin || 'no-origin'}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});

export default app;
