import crypto from 'crypto';
import { prisma } from '../db/prisma';

const TOKEN_BYTES = 32;            // 256-bit, URL-safe
const DEFAULT_TTL_MINUTES = 15;

export type LoginTokenPurpose =
  | 'login'
  | 'invite-claim'
  | 'legacy-claim'
  | 'reset-password';

function generateToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString('base64url');
}

/**
 * Create a single-use magic-link token for an account.
 *
 * Returns the raw token string (caller is responsible for embedding it in
 * the magic-link URL it sends to the user).
 */
export async function createLoginToken(args: {
  accountId: string;
  purpose: LoginTokenPurpose;
  targetPath?: string | null;
  ttlMinutes?: number;
}): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = new Date(
    Date.now() + (args.ttlMinutes ?? DEFAULT_TTL_MINUTES) * 60 * 1000,
  );

  await prisma.loginToken.create({
    data: {
      token,
      accountId: args.accountId,
      purpose: args.purpose,
      targetPath: args.targetPath ?? null,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export type ConsumeResult =
  | { ok: true; accountId: string; purpose: LoginTokenPurpose; targetPath: string | null }
  | { ok: false; reason: 'not_found' | 'expired' | 'already_consumed' };

/**
 * Consume a magic-link token. Marks it consumed atomically so it can't be
 * replayed. Returns the linked account on success.
 */
export async function consumeLoginToken(args: {
  token: string;
  ip?: string | null;
}): Promise<ConsumeResult> {
  const row = await prisma.loginToken.findUnique({
    where: { token: args.token },
  });

  if (!row) return { ok: false, reason: 'not_found' };
  if (row.consumedAt) return { ok: false, reason: 'already_consumed' };
  if (row.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  // Atomic mark-as-consumed: if a parallel request beats us, the WHERE
  // clause filters us out and updateMany returns 0.
  const result = await prisma.loginToken.updateMany({
    where: { id: row.id, consumedAt: null },
    data: {
      consumedAt: new Date(),
      consumedIp: args.ip ?? null,
    },
  });
  if (result.count === 0) {
    return { ok: false, reason: 'already_consumed' };
  }

  return {
    ok: true,
    accountId: row.accountId,
    purpose: row.purpose as LoginTokenPurpose,
    targetPath: row.targetPath,
  };
}

/**
 * Count recent unexpired magic-link requests for an email/account in the
 * given window. Used by the request endpoint to enforce a soft rate limit
 * (e.g. max 3 per hour) without leaking whether the email exists in the DB.
 */
export async function countRecentLoginTokens(args: {
  accountId: string;
  withinMinutes: number;
}): Promise<number> {
  const since = new Date(Date.now() - args.withinMinutes * 60 * 1000);
  return prisma.loginToken.count({
    where: {
      accountId: args.accountId,
      purpose: 'login',
      createdAt: { gte: since },
    },
  });
}
