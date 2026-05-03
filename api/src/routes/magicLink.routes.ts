import crypto from 'crypto';
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

/**
 * Build a non-loginable bcrypt-shaped placeholder for accounts that are
 * created via the magic-link signup flow and have no password yet. The
 * value is random so it cannot match any real password; the column is
 * NOT NULL in the schema so we have to put *something* here. Users who
 * want to set a real password can do so later via the change-password
 * flow once we ship "set initial password".
 */
function placeholderPasswordHash(): string {
  // bcrypt hashes start with `$2`; we don't use $2 to make it obvious
  // these are not real bcrypt outputs and to fail-fast in `bcrypt.compare`.
  return `!magic-link-only!${crypto.randomBytes(24).toString('hex')}`;
}

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

    // Magic-link is the unified login + signup path: an unknown email
    // creates an `unverified` account on the fly. The first successful
    // consume of the link flips the account to `active` and creates the
    // session. Doing this on request (rather than on consume) keeps the
    // token model simple — every token still binds to a real account.
    const account = await prisma.account.upsert({
      where: { email: rawEmail },
      create: {
        email: rawEmail,
        passwordHash: placeholderPasswordHash(),
        status: 'unverified',
      },
      update: {},
      select: { id: true, email: true, status: true, locale: true },
    });

    // `deactivated` accounts get the same silent 200 as before — admins
    // disabled them and they shouldn't be able to bounce back via a
    // magic-link. `active` and `unverified` both proceed.
    if (account.status === 'deactivated') {
      console.log(
        `[magic-link] request blocked — account=${account.id} status=deactivated`,
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

    let account = await prisma.account.findUnique({
      where: { id: result.accountId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
    if (!account || account.status === 'deactivated') {
      res.status(401).json({
        error: 'ACCOUNT_INACTIVE',
        message: 'Konto ist nicht aktiv.',
      });
      return;
    }

    // First click on the magic link doubles as email verification for
    // accounts created via magic-link signup.
    let justActivated = false;
    if (account.status === 'unverified') {
      account = await prisma.account.update({
        where: { id: account.id },
        data: { status: 'active' },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });
      justActivated = true;
      console.log(`[magic-link] activated unverified account=${account.id}`);
    }

    // Welcome email — first activation only. Email send failures must
    // not block the consume flow; the user is already authenticated and
    // we have a session ready to issue.
    if (justActivated) {
      const accountForMail = account;
      const accountLocale = await prisma.account
        .findUnique({ where: { id: account.id }, select: { locale: true } })
        .then((r) => r?.locale ?? null);
      sendTemplatedEmail({
        to: accountForMail.email,
        template: 'welcome',
        locale: accountLocale,
        variables: {},
      }).catch((err) => {
        console.error(
          `[magic-link] welcome email failed account=${accountForMail.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      });
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
