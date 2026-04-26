import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { SessionService } from '../services/session.service';
import {
  createLoginToken,
  consumeLoginToken,
  countRecentLoginTokens,
} from '../services/loginToken.service';
import { sendTemplatedEmail } from '../services/email.service';
import { config } from '../config';

const router = Router();
const sessionService = new SessionService(prisma);

const MAX_REQUESTS_PER_HOUR = 3;
const TOKEN_TTL_MINUTES = 15;

function buildMagicLinkUrl(token: string): string {
  return `${config.app.publicUrl}/auth/magic?token=${encodeURIComponent(token)}`;
}

/**
 * POST /api/auth/magic-link/request
 * Body: { email: string }
 *
 * Always returns 200 (even if the email is unknown) to avoid leaking which
 * accounts exist. Real failures (SMTP, DB) are logged server-side; the user
 * just sees a generic "Wir haben dir einen Link geschickt" message.
 *
 * Rate-limited per account: max MAX_REQUESTS_PER_HOUR within 60 minutes.
 */
router.post('/magic-link/request', async (req: Request, res: Response) => {
  const ts = new Date().toISOString();
  try {
    const rawEmail = (req.body?.email ?? '').toString().trim().toLowerCase();
    if (!rawEmail || !/^.+@.+\..+$/.test(rawEmail)) {
      res.status(400).json({
        error: 'INVALID_EMAIL',
        message: 'Bitte eine gültige E-Mail-Adresse eingeben.',
      });
      return;
    }

    const account = await prisma.account.findUnique({
      where: { email: rawEmail },
      select: { id: true, email: true, status: true, locale: true },
    });

    if (!account) {
      // Unknown email — silent success.
      console.log(`[magic-link] request for unknown email=${rawEmail} — silent 200`);
      res.json({ ok: true });
      return;
    }

    if (account.status !== 'active') {
      console.log(
        `[magic-link] request blocked — account=${account.id} status=${account.status}`,
      );
      res.json({ ok: true });
      return;
    }

    // Rate limit
    const recent = await countRecentLoginTokens({
      accountId: account.id,
      withinMinutes: 60,
    });
    if (recent >= MAX_REQUESTS_PER_HOUR) {
      console.warn(
        `[magic-link] rate-limited account=${account.id} recent=${recent}/h`,
      );
      // Same 200 response — the user shouldn't be able to probe rate-limit state.
      res.json({ ok: true });
      return;
    }

    const { token } = await createLoginToken({
      accountId: account.id,
      purpose: 'login',
      ttlMinutes: TOKEN_TTL_MINUTES,
    });

    const link = buildMagicLinkUrl(token);

    try {
      await sendTemplatedEmail({
        to: account.email,
        template: 'magic-link',
        locale: account.locale,
        variables: {
          link,
          expiresInMinutes: TOKEN_TTL_MINUTES,
        },
      });
      console.log(
        `[magic-link] issued for account=${account.id} expires_in=${TOKEN_TTL_MINUTES}m`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[magic-link] email send failed account=${account.id}: ${msg}`);
      // Still return 200 — token is in DB, the user can retry the request and
      // we'll generate a new one. Not exposing the SMTP failure is intentional.
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(`[${ts}] magic-link/request error:`, err);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Ein Fehler ist aufgetreten. Bitte später erneut versuchen.',
    });
  }
});

/**
 * GET /api/auth/magic-link/consume?token=…
 *
 * Consumes a magic-link token. On success returns the same shape as the
 * password login (`{ token, account }`) so the frontend can store the JWT
 * and proceed identically. On any failure returns a typed error so the
 * frontend can show a useful message.
 */
router.get('/magic-link/consume', async (req: Request, res: Response) => {
  try {
    const token = (req.query.token ?? '').toString();
    if (!token) {
      res.status(400).json({ error: 'MISSING_TOKEN', message: 'Kein Token übergeben.' });
      return;
    }

    const ip = req.ip || req.socket.remoteAddress || null;
    const result = await consumeLoginToken({ token, ip });

    if (!result.ok) {
      const messages: Record<string, string> = {
        not_found: 'Ungültiger Anmelde-Link.',
        expired: 'Der Anmelde-Link ist abgelaufen. Bitte einen neuen anfordern.',
        already_consumed: 'Dieser Anmelde-Link wurde bereits verwendet.',
      };
      res.status(400).json({
        error: result.reason.toUpperCase(),
        message: messages[result.reason] ?? 'Ungültiger Anmelde-Link.',
      });
      return;
    }

    const account = await prisma.account.findUnique({
      where: { id: result.accountId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
    if (!account || account.status !== 'active') {
      res.status(401).json({
        error: 'ACCOUNT_INACTIVE',
        message: 'Konto ist nicht aktiv.',
      });
      return;
    }

    const jwt = await sessionService.createSession(
      account.id,
      req.headers['user-agent'] as string | undefined,
      req.ip || req.socket.remoteAddress,
    );

    res.json({
      token: jwt,
      account: {
        ...account,
        createdAt: account.createdAt.toISOString(),
      },
      targetPath: result.targetPath ?? '/events',
    });
  } catch (err) {
    console.error('magic-link/consume error:', err);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Ein Fehler ist aufgetreten. Bitte später erneut versuchen.',
    });
  }
});

export default router;
