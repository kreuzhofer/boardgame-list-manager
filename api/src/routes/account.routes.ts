import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AccountService, AccountError } from '../services/account.service';
import { SessionService } from '../services/session.service';
import { ParticipationService } from '../services/participation.service';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();
const accountService = new AccountService(prisma);
const sessionService = new SessionService(prisma);
const participationService = new ParticipationService(prisma);

/**
 * POST /api/accounts/register
 * Creates a new account
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        error: 'MISSING_FIELDS',
        message: 'E-Mail und Passwort sind erforderlich.',
      });
      return;
    }

    const account = await accountService.register({ email, password });

    res.status(201).json({
      account,
      message: 'Konto erfolgreich erstellt. Bitte melden Sie sich an.',
    });
  } catch (error) {
    if (error instanceof AccountError) {
      res.status(error.statusCode).json({
        error: error.code,
        message: error.message,
      });
      return;
    }
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Ein Fehler ist aufgetreten. Bitte später erneut versuchen.',
    });
  }
});

/**
 * POST /api/accounts/login
 * Authenticates and returns JWT token
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        error: 'MISSING_FIELDS',
        message: 'E-Mail und Passwort sind erforderlich.',
      });
      return;
    }

    const account = await accountService.authenticate(email, password);

    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;

    const token = await sessionService.createSession(
      account.id,
      userAgent,
      ipAddress
    );

    res.json({
      token,
      account,
    });
  } catch (error) {
    if (error instanceof AccountError) {
      res.status(error.statusCode).json({
        error: error.code,
        message: error.message,
      });
      return;
    }
    console.error('Login error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Ein Fehler ist aufgetreten. Bitte später erneut versuchen.',
    });
  }
});

/**
 * GET /api/accounts/me
 * Returns current account profile (requires auth)
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  res.json({ account: authReq.account });
});

/**
 * GET /api/accounts
 * Lists all accounts (admin only)
 */
router.get('/', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const accounts = await accountService.getAll();
    res.json({ accounts });
  } catch (error) {
    console.error('List accounts error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Ein Fehler ist aufgetreten. Bitte später erneut versuchen.',
    });
  }
});

/**
 * PATCH /api/accounts/me/password
 * Changes password (requires auth, invalidates other sessions)
 */
router.patch('/me/password', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        error: 'MISSING_FIELDS',
        message: 'Aktuelles und neues Passwort sind erforderlich.',
      });
      return;
    }

    await accountService.changePassword(
      authReq.account.id,
      currentPassword,
      newPassword
    );

    // Invalidate all other sessions
    await sessionService.deleteAllSessionsExcept(
      authReq.account.id,
      authReq.sessionId
    );

    res.json({
      success: true,
      message: 'Passwort erfolgreich geändert. Alle anderen Sitzungen wurden beendet.',
    });
  } catch (error) {
    if (error instanceof AccountError) {
      res.status(error.statusCode).json({
        error: error.code,
        message: error.message,
      });
      return;
    }
    console.error('Password change error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Ein Fehler ist aufgetreten. Bitte später erneut versuchen.',
    });
  }
});

/**
 * GET /api/accounts/me/participations
 *
 * Phase 2 of the identity migration: lists every event the
 * authenticated account has joined as an EventParticipation. Backs the
 * "Meine Treffs" page.
 */
router.get('/me/participations', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const rows = await participationService.listForAccount(authReq.account.id);

    res.json({
      participations: rows.map((p) => ({
        id: p.id,
        eventId: p.eventId,
        displayName: p.displayName,
        role: p.role,
        status: p.status,
        joinedAt: p.joinedAt.toISOString(),
        event: p.event && {
          id: p.event.id,
          name: p.event.name,
          slug: p.event.slug,
          status: p.event.status,
          startsAt: p.event.startsAt?.toISOString() ?? null,
          endsAt: p.event.endsAt?.toISOString() ?? null,
          location: p.event.location,
        },
      })),
    });
  } catch (error) {
    console.error('List participations error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Ein Fehler ist aufgetreten. Bitte später erneut versuchen.',
    });
  }
});

/**
 * POST /api/accounts/me/email
 * Body: { newEmail: string }
 *
 * Step 1 of the email-change flow. Creates a single-use confirmation
 * token bound to (accountId, newEmail), sends the confirm link to the
 * NEW address and a notice to the OLD address. The actual swap happens
 * in `/email-change/confirm` once the user clicks the link.
 */
router.post('/me/email', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { newEmail } = req.body;

    if (!newEmail || typeof newEmail !== 'string') {
      res.status(400).json({
        error: 'MISSING_FIELDS',
        message: 'Bitte eine neue E-Mail-Adresse eingeben.',
      });
      return;
    }

    await accountService.requestEmailChange(authReq.account.id, newEmail);

    res.json({
      success: true,
      message:
        'Wir haben einen Bestätigungs-Link an die neue Adresse geschickt. Klicke darauf, um die Änderung abzuschließen.',
    });
  } catch (error) {
    if (error instanceof AccountError) {
      res.status(error.statusCode).json({ error: error.code, message: error.message });
      return;
    }
    console.error('Email-change request error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Ein Fehler ist aufgetreten. Bitte später erneut versuchen.',
    });
  }
});

/**
 * POST /api/accounts/email-change/confirm
 * Body: { token: string }
 *
 * Step 2 of the email-change flow. Public — the recipient of the confirm
 * mail clicks the link and the frontend posts the token here. On success
 * returns the updated account; the user's existing session keeps working
 * (account id is unchanged).
 */
router.post('/email-change/confirm', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      res.status(400).json({
        error: 'MISSING_TOKEN',
        message: 'Kein Bestätigungs-Token übergeben.',
      });
      return;
    }

    const ip = req.ip || req.socket.remoteAddress || null;
    const account = await accountService.confirmEmailChange(token, ip);
    res.json({ success: true, account });
  } catch (error) {
    if (error instanceof AccountError) {
      res.status(error.statusCode).json({ error: error.code, message: error.message });
      return;
    }
    console.error('Email-change confirm error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Ein Fehler ist aufgetreten. Bitte später erneut versuchen.',
    });
  }
});

/**
 * POST /api/accounts/me/deactivate
 * Deactivates account (requires auth, password confirmation)
 */
router.post('/me/deactivate', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { password } = req.body;

    if (!password) {
      res.status(400).json({
        error: 'MISSING_FIELDS',
        message: 'Passwort ist erforderlich.',
      });
      return;
    }

    await accountService.deactivate(authReq.account.id, password);

    // Delete all sessions
    await sessionService.deleteAllSessions(authReq.account.id);

    res.json({
      success: true,
      message: 'Konto erfolgreich deaktiviert.',
    });
  } catch (error) {
    if (error instanceof AccountError) {
      res.status(error.statusCode).json({
        error: error.code,
        message: error.message,
      });
      return;
    }
    console.error('Deactivation error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Ein Fehler ist aufgetreten. Bitte später erneut versuchen.',
    });
  }
});

/**
 * POST /api/accounts/:id/promote
 * Promotes account to admin (requires admin auth)
 */
router.post('/:id/promote', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    const account = await accountService.promoteToAdmin(id, authReq.account.id);

    res.json({ account });
  } catch (error) {
    if (error instanceof AccountError) {
      res.status(error.statusCode).json({
        error: error.code,
        message: error.message,
      });
      return;
    }
    console.error('Promotion error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Ein Fehler ist aufgetreten. Bitte später erneut versuchen.',
    });
  }
});

/**
 * PATCH /api/accounts/:id/role
 * Updates account role (admin only)
 */
router.patch('/:id/role', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (role !== 'admin' && role !== 'account_owner') {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Ungültige Rolle.',
      });
      return;
    }

    const authReq = req as AuthenticatedRequest;
    const account = await accountService.setRole(id, role, authReq.account.id);
    res.json({ account });
  } catch (error) {
    if (error instanceof AccountError) {
      res.status(error.statusCode).json({
        error: error.code,
        message: error.message,
      });
      return;
    }
    console.error('Role update error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Ein Fehler ist aufgetreten. Bitte später erneut versuchen.',
    });
  }
});

/**
 * PATCH /api/accounts/:id/status
 * Updates account status (admin only)
 */
router.patch('/:id/status', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'active' && status !== 'deactivated') {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Ungültiger Status.',
      });
      return;
    }

    const account = await accountService.setStatus(id, status, authReq.account.id);
    res.json({ account });
  } catch (error) {
    if (error instanceof AccountError) {
      res.status(error.statusCode).json({
        error: error.code,
        message: error.message,
      });
      return;
    }
    console.error('Status update error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Ein Fehler ist aufgetreten. Bitte später erneut versuchen.',
    });
  }
});

/**
 * PATCH /api/accounts/:id/password
 * Resets account password (admin only)
 */
router.patch('/:id/password', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string') {
      res.status(400).json({
        error: 'MISSING_FIELDS',
        message: 'Neues Passwort ist erforderlich.',
      });
      return;
    }

    await accountService.resetPassword(id, newPassword);
    await sessionService.deleteAllSessions(id);

    res.json({
      success: true,
      message: 'Passwort zurückgesetzt. Alle Sitzungen wurden beendet.',
    });
  } catch (error) {
    if (error instanceof AccountError) {
      res.status(error.statusCode).json({
        error: error.code,
        message: error.message,
      });
      return;
    }
    console.error('Password reset error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Ein Fehler ist aufgetreten. Bitte später erneut versuchen.',
    });
  }
});

/**
 * DELETE /api/accounts/:id/sessions
 * Force logout all sessions for account (admin only)
 */
router.delete('/:id/sessions', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await sessionService.deleteAllSessions(id);
    res.json({
      success: true,
      message: 'Alle Sitzungen wurden beendet.',
    });
  } catch (error) {
    if (error instanceof AccountError) {
      res.status(error.statusCode).json({
        error: error.code,
        message: error.message,
      });
      return;
    }
    console.error('Force logout error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Ein Fehler ist aufgetreten. Bitte später erneut versuchen.',
    });
  }
});

export default router;
