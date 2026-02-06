import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AccountService, AccountError } from '../services/account.service';
import { SessionService } from '../services/session.service';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();
const accountService = new AccountService(prisma);
const sessionService = new SessionService(prisma);

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

    const account = await accountService.setRole(id, role);
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
