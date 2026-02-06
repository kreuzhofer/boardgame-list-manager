import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { SessionService } from '../services/session.service';
import { AccountService } from '../services/account.service';
import { AccountResponse, AccountErrorCodes, AccountErrorMessages } from '../types/account';

export interface AuthenticatedRequest extends Request {
  account: AccountResponse;
  sessionId: string;
}

const prisma = new PrismaClient();
const sessionService = new SessionService(prisma);
const accountService = new AccountService(prisma);

/**
 * Extract Bearer token from Authorization header
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Resolve optional account from Authorization header.
 * Returns null when token is missing or invalid.
 */
export async function resolveOptionalAccount(req: Request): Promise<AccountResponse | null> {
  const token = extractToken(req);

  if (!token) {
    return null;
  }

  const payload = await sessionService.validateToken(token);

  if (!payload) {
    return null;
  }

  const account = await accountService.getById(payload.accountId);

  if (!account) {
    return null;
  }

  if (account.status === 'deactivated') {
    return null;
  }

  return account;
}

/**
 * Middleware that requires valid JWT token
 * Attaches account and sessionId to request
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({
      error: AccountErrorCodes.INVALID_TOKEN,
      message: AccountErrorMessages.INVALID_TOKEN,
    });
    return;
  }

  const payload = await sessionService.validateToken(token);

  if (!payload) {
    res.status(401).json({
      error: AccountErrorCodes.INVALID_TOKEN,
      message: AccountErrorMessages.INVALID_TOKEN,
    });
    return;
  }

  const account = await accountService.getById(payload.accountId);

  if (!account) {
    res.status(401).json({
      error: AccountErrorCodes.ACCOUNT_NOT_FOUND,
      message: AccountErrorMessages.ACCOUNT_NOT_FOUND,
    });
    return;
  }

  if (account.status === 'deactivated') {
    res.status(403).json({
      error: AccountErrorCodes.ACCOUNT_DEACTIVATED,
      message: AccountErrorMessages.ACCOUNT_DEACTIVATED,
    });
    return;
  }

  // Attach account and sessionId to request
  (req as AuthenticatedRequest).account = account;
  (req as AuthenticatedRequest).sessionId = payload.sessionId;

  next();
}

/**
 * Middleware that requires admin role
 * Must be used after requireAuth
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.account) {
    res.status(401).json({
      error: AccountErrorCodes.INVALID_TOKEN,
      message: AccountErrorMessages.INVALID_TOKEN,
    });
    return;
  }

  if (authReq.account.role !== 'admin') {
    res.status(403).json({
      error: AccountErrorCodes.NOT_AUTHORIZED,
      message: AccountErrorMessages.NOT_AUTHORIZED,
    });
    return;
  }

  next();
}
