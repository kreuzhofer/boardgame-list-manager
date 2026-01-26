import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { SessionService, SessionError } from '../services/session.service';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();
const sessionService = new SessionService(prisma);

/**
 * GET /api/sessions
 * Returns all active sessions for current account (requires auth)
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const sessions = await sessionService.getSessionsForAccount(authReq.account.id);

    // Add isCurrent flag to each session
    const sessionsWithCurrent = sessions.map((session) => ({
      ...session,
      isCurrent: session.id === authReq.sessionId,
    }));

    res.json({ sessions: sessionsWithCurrent });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Ein Fehler ist aufgetreten. Bitte später erneut versuchen.',
    });
  }
});

/**
 * DELETE /api/sessions
 * Logs out all devices (requires auth)
 */
router.delete('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    await sessionService.deleteAllSessions(authReq.account.id);

    res.json({
      success: true,
      message: 'Alle Sitzungen wurden beendet.',
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Ein Fehler ist aufgetreten. Bitte später erneut versuchen.',
    });
  }
});

/**
 * DELETE /api/sessions/:id
 * Logs out specific session (requires auth)
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    await sessionService.deleteSession(id, authReq.account.id);

    res.json({ success: true });
  } catch (error) {
    if (error instanceof SessionError) {
      res.status(error.statusCode).json({
        error: error.code,
        message: error.message,
      });
      return;
    }
    console.error('Delete session error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Ein Fehler ist aufgetreten. Bitte später erneut versuchen.',
    });
  }
});

export default router;
