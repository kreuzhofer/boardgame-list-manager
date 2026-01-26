import { PrismaClient } from '@prisma/client';
import { SessionService, SessionError } from '../session.service';
import { AccountService } from '../account.service';
import { AccountErrorCodes } from '../../types/account';

const prisma = new PrismaClient();
const sessionService = new SessionService(prisma);
const accountService = new AccountService(prisma);

describe('SessionService', () => {
  const testAccountIds: string[] = [];
  let testAccountId: string;

  beforeAll(async () => {
    // Create a test account
    const email = `test-session-${Date.now()}@example.com`;
    const account = await accountService.register({ email, password: 'TestPass123' });
    testAccountId = account.id;
    testAccountIds.push(account.id);
  });

  afterAll(async () => {
    // Clean up test accounts (sessions will cascade delete)
    if (testAccountIds.length > 0) {
      await prisma.account.deleteMany({
        where: { id: { in: testAccountIds } },
      });
    }
    await prisma.$disconnect();
  });

  describe('createSession', () => {
    it('creates session and returns JWT token', async () => {
      const token = await sessionService.createSession(testAccountId, 'Test User Agent', '127.0.0.1');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('stores session in database', async () => {
      await sessionService.createSession(testAccountId);

      const sessions = await sessionService.getSessionsForAccount(testAccountId);
      expect(sessions.length).toBeGreaterThan(0);
    });
  });

  describe('validateToken', () => {
    it('returns payload for valid token', async () => {
      const token = await sessionService.createSession(testAccountId);

      const payload = await sessionService.validateToken(token);

      expect(payload).not.toBeNull();
      expect(payload?.accountId).toBe(testAccountId);
      expect(payload?.sessionId).toBeDefined();
    });

    it('returns null for invalid token', async () => {
      const payload = await sessionService.validateToken('invalid-token');
      expect(payload).toBeNull();
    });

    it('returns null for expired/deleted session', async () => {
      const token = await sessionService.createSession(testAccountId);
      const payload = await sessionService.validateToken(token);

      // Delete the session
      await sessionService.deleteSession(payload!.sessionId, testAccountId);

      // Token should now be invalid
      const invalidPayload = await sessionService.validateToken(token);
      expect(invalidPayload).toBeNull();
    });
  });

  describe('getSessionsForAccount', () => {
    it('returns all sessions for account', async () => {
      // Create a new account for this test
      const email = `test-sessions-list-${Date.now()}@example.com`;
      const account = await accountService.register({ email, password: 'TestPass123' });
      testAccountIds.push(account.id);

      // Create multiple sessions
      await sessionService.createSession(account.id, 'Chrome', '192.168.1.1');
      await sessionService.createSession(account.id, 'Firefox', '192.168.1.2');
      await sessionService.createSession(account.id, 'Safari', '192.168.1.3');

      const sessions = await sessionService.getSessionsForAccount(account.id);

      expect(sessions.length).toBe(3);
      expect(sessions[0].userAgent).toBeDefined();
    });

    it('returns empty array for account with no sessions', async () => {
      const email = `test-no-sessions-${Date.now()}@example.com`;
      const account = await accountService.register({ email, password: 'TestPass123' });
      testAccountIds.push(account.id);

      const sessions = await sessionService.getSessionsForAccount(account.id);
      expect(sessions).toEqual([]);
    });
  });

  describe('deleteSession', () => {
    it('deletes specific session', async () => {
      const email = `test-delete-session-${Date.now()}@example.com`;
      const account = await accountService.register({ email, password: 'TestPass123' });
      testAccountIds.push(account.id);

      const token = await sessionService.createSession(account.id);
      const payload = await sessionService.validateToken(token);

      await sessionService.deleteSession(payload!.sessionId, account.id);

      const sessions = await sessionService.getSessionsForAccount(account.id);
      expect(sessions.length).toBe(0);
    });

    it('throws SESSION_NOT_FOUND for non-existent session', async () => {
      await expect(
        sessionService.deleteSession('non-existent-id', testAccountId)
      ).rejects.toThrow(SessionError);
      try {
        await sessionService.deleteSession('non-existent-id', testAccountId);
      } catch (error) {
        expect((error as SessionError).code).toBe(AccountErrorCodes.SESSION_NOT_FOUND);
      }
    });

    it('throws NOT_AUTHORIZED for session belonging to different account', async () => {
      const email1 = `test-auth-check-1-${Date.now()}@example.com`;
      const email2 = `test-auth-check-2-${Date.now()}@example.com`;

      const account1 = await accountService.register({ email: email1, password: 'TestPass123' });
      const account2 = await accountService.register({ email: email2, password: 'TestPass123' });
      testAccountIds.push(account1.id, account2.id);

      const token = await sessionService.createSession(account1.id);
      const payload = await sessionService.validateToken(token);

      await expect(
        sessionService.deleteSession(payload!.sessionId, account2.id)
      ).rejects.toThrow(SessionError);
      try {
        await sessionService.deleteSession(payload!.sessionId, account2.id);
      } catch (error) {
        expect((error as SessionError).code).toBe(AccountErrorCodes.NOT_AUTHORIZED);
      }
    });
  });

  describe('deleteAllSessions', () => {
    it('deletes all sessions for account', async () => {
      const email = `test-delete-all-${Date.now()}@example.com`;
      const account = await accountService.register({ email, password: 'TestPass123' });
      testAccountIds.push(account.id);

      // Create multiple sessions
      await sessionService.createSession(account.id);
      await sessionService.createSession(account.id);
      await sessionService.createSession(account.id);

      let sessions = await sessionService.getSessionsForAccount(account.id);
      expect(sessions.length).toBe(3);

      await sessionService.deleteAllSessions(account.id);

      sessions = await sessionService.getSessionsForAccount(account.id);
      expect(sessions.length).toBe(0);
    });
  });

  describe('deleteAllSessionsExcept', () => {
    it('deletes all sessions except specified one', async () => {
      const email = `test-delete-except-${Date.now()}@example.com`;
      const account = await accountService.register({ email, password: 'TestPass123' });
      testAccountIds.push(account.id);

      // Create multiple sessions
      const token1 = await sessionService.createSession(account.id, 'Session 1');
      await sessionService.createSession(account.id, 'Session 2');
      await sessionService.createSession(account.id, 'Session 3');

      const payload1 = await sessionService.validateToken(token1);

      let sessions = await sessionService.getSessionsForAccount(account.id);
      expect(sessions.length).toBe(3);

      await sessionService.deleteAllSessionsExcept(account.id, payload1!.sessionId);

      sessions = await sessionService.getSessionsForAccount(account.id);
      expect(sessions.length).toBe(1);
      expect(sessions[0].id).toBe(payload1!.sessionId);
    });
  });
});
