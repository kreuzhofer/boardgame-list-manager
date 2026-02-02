import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { TokenPayload, Session, AccountErrorCodes, AccountErrorMessages } from '../types/account';

export class SessionError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'SessionError';
  }
}

export class SessionService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new session and return JWT token
   */
  async createSession(
    accountId: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<string> {
    const session = await this.prisma.session.create({
      data: {
        accountId,
        userAgent,
        ipAddress,
      },
    });

    const payload: TokenPayload = {
      accountId,
      sessionId: session.id,
    };

    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: '7d',
    });

    return token;
  }

  /**
   * Validate JWT token and return payload
   * Returns null if token is invalid or session doesn't exist
   */
  async validateToken(token: string): Promise<TokenPayload | null> {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as TokenPayload;

      // Check if session still exists
      const session = await this.prisma.session.findUnique({
        where: { id: payload.sessionId },
      });

      if (!session) {
        return null;
      }

      // Update lastUsedAt
      await this.prisma.session.update({
        where: { id: payload.sessionId },
        data: { lastUsedAt: new Date() },
      });

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Get all sessions for an account
   */
  async getSessionsForAccount(accountId: string): Promise<Session[]> {
    const sessions = await this.prisma.session.findMany({
      where: { accountId },
      orderBy: { lastUsedAt: 'desc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      accountId: s.accountId,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      lastUsedAt: s.lastUsedAt,
    }));
  }

  /**
   * Delete a specific session
   */
  async deleteSession(sessionId: string, accountId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new SessionError(
        AccountErrorCodes.SESSION_NOT_FOUND,
        AccountErrorMessages.SESSION_NOT_FOUND,
        404
      );
    }

    // Ensure the session belongs to the account
    if (session.accountId !== accountId) {
      throw new SessionError(
        AccountErrorCodes.NOT_AUTHORIZED,
        AccountErrorMessages.NOT_AUTHORIZED,
        403
      );
    }

    await this.prisma.session.delete({
      where: { id: sessionId },
    });
  }

  /**
   * Delete all sessions for an account (logout all devices)
   */
  async deleteAllSessions(accountId: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { accountId },
    });
  }

  /**
   * Delete all sessions except one (for password change)
   */
  async deleteAllSessionsExcept(
    accountId: string,
    exceptSessionId: string
  ): Promise<void> {
    await this.prisma.session.deleteMany({
      where: {
        accountId,
        id: { not: exceptSessionId },
      },
    });
  }
}
