import express from 'express';
import cors from 'cors';
import * as path from 'path';
import accountRoutes from './routes/account.routes';
import authRoutes from './routes/auth.routes';
import bggRoutes from './routes/bgg.routes';
import gameRoutes from './routes/game.routes';
import sessionRoutes from './routes/session.routes';
import adminSseRoutes from './routes/adminSse.routes';
import sseRoutes from './routes/sse.routes';
import statisticsRoutes from './routes/statistics.routes';
import thumbnailRoutes from './routes/thumbnail.routes';
import participantRoutes from './routes/participant.routes';
import eventRoutes from './routes/event.routes';
import webhookRoutes from './routes/webhook.routes';
import donationRoutes from './routes/donation.routes';
import magicLinkRoutes from './routes/magicLink.routes';
import { bggCache } from './services';
import { config } from './config';
import { prisma } from './db/prisma';
import { AccountService } from './services/account.service';
import { eventService } from './services/event.service';
import { initEmailService, isSmtpReady } from './services/email.service';

const app = express();
const PORT = config.server.port;
const accountService = new AccountService(prisma);

// Middleware
// CORS configuration - uses CORS_ORIGIN from env, supports comma-separated origins
const corsOrigins = config.server.corsOrigin.split(',').map(o => o.trim());
app.use(cors({
  origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
  credentials: true,
}));
// Capture the raw request body alongside parsed JSON so webhook handlers
// can verify HMAC signatures over the unmodified bytes.
app.use(express.json({
  verify: (req, _res, buf) => {
    (req as unknown as { rawBody?: Buffer }).rawBody = buf;
  },
}));

// Request logging for debugging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url} from ${req.headers.origin || 'no-origin'}`);
  next();
});

// Routes
app.use('/api/accounts', accountRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/auth', magicLinkRoutes);
app.use('/api/bgg', bggRoutes);
app.use('/api/sse/admin', adminSseRoutes);
app.use('/api/sse', sseRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/thumbnails', thumbnailRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/users', participantRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/donations', donationRoutes);

// Health check endpoint - includes BGG cache status for debugging
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    bggCache: {
      loaded: bggCache.isLoaded(),
      dataSource: bggCache.getDataSource(),
      gameCount: bggCache.getCount(),
    },
    smtpReady: isSmtpReady(),
  });
});

// Initialize BGG cache at startup
const initializeBggCache = async () => {
  const csvPath = path.join(__dirname, '..', 'data', 'boardgames_ranks.csv');
  console.log(`Loading BGG data from: ${csvPath}`);
  await bggCache.initialize(csvPath);
};

const ensureDefaultAdmin = async (): Promise<string> => {
  const existingAdmin = await prisma.account.findFirst({
    where: { role: 'admin' },
    select: { id: true },
  });

  if (existingAdmin) {
    return existingAdmin.id;
  }

  const email = config.admin.defaultEmail.toLowerCase();
  const passwordHash = await accountService.hashPassword(
    config.admin.defaultPassword
  );

  const existingByEmail = await prisma.account.findUnique({
    where: { email },
  });

  const account = existingByEmail
    ? await prisma.account.update({
        where: { id: existingByEmail.id },
        data: {
          role: 'admin',
          status: 'active',
          passwordHash,
        },
      })
    : await prisma.account.create({
        data: {
          email,
          passwordHash,
          role: 'admin',
          status: 'active',
        },
      });

  if (config.admin.defaultPassword === 'admin') {
    console.warn(
      '[Bootstrap] Default admin password is set to "admin". Please change it.'
    );
  }

  return account.id;
};

const initializeSystem = async () => {
  const adminId = await ensureDefaultAdmin();
  const defaultEventId = await eventService.ensureDefaultEvent(adminId);
  await eventService.backfillDefaultEvent(defaultEventId);
  await eventService.backfillSlugs();
  // Reap any events whose 30-day soft-delete grace has elapsed.
  // Lazy sweep on `getEventsForOwner` covers steady-state usage; this
  // boot sweep handles long-idle deployments where no owner has
  // listed their events recently.
  const purge = await eventService.purgeExpiredDeletedEvents().catch((err) => {
    console.error('[bootstrap] Initial purge failed:', err);
    return { purged: 0 };
  });
  if (purge.purged > 0) {
    console.log(`[bootstrap] Purged ${purge.purged} expired deleted events`);
  }
};

// Start server
Promise.all([initializeSystem(), initializeBggCache(), initEmailService()])
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize system:', error);
    // Start server anyway - graceful degradation
    app.listen(PORT, () => {
      console.log(`API server running on port ${PORT} (bootstrap failed)`);
    });
  });


export default app;
