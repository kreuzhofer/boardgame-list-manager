import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { SessionService } from '../services/session.service';
import { AccountService } from '../services/account.service';
import { adminSseManager } from '../services';

const prisma = new PrismaClient();
const sessionService = new SessionService(prisma);
const accountService = new AccountService(prisma);

const router = Router();
const HEARTBEAT_INTERVAL = 30000;

/**
 * GET /api/sse/admin?token=...
 * Admin-only SSE endpoint for BGG import/enrichment progress.
 * Auth via query param because EventSource cannot send headers.
 */
router.get('/', async (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token : null;

  if (!token) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Token required.' });
    return;
  }

  const payload = await sessionService.validateToken(token);
  if (!payload) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid token.' });
    return;
  }

  const account = await accountService.getById(payload.accountId);
  if (!account || account.status === 'deactivated') {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Account not found.' });
    return;
  }

  if (account.role !== 'admin') {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Admin required.' });
    return;
  }

  // Auth passed — establish SSE stream
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const clientId = uuidv4();
  adminSseManager.addClient(clientId, res);

  console.log(`Admin SSE client connected: ${clientId} (total: ${adminSseManager.getClientCount()})`);

  res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch {
      clearInterval(heartbeatInterval);
    }
  }, HEARTBEAT_INTERVAL);

  req.on('close', () => {
    clearInterval(heartbeatInterval);
    adminSseManager.removeClient(clientId);
    console.log(`Admin SSE client disconnected: ${clientId} (total: ${adminSseManager.getClientCount()})`);
  });
});

export default router;
