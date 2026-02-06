import * as fc from 'fast-check';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { SessionService } from '../session.service';
import { AccountService } from '../account.service';
import { config } from '../../config';

const prisma = new PrismaClient();
const sessionService = new SessionService(prisma);
const accountService = new AccountService(prisma);

// Helper to generate test emails
const testEmailArbitrary = () =>
  fc.tuple(
    fc.stringMatching(/^[a-z]{5,10}$/),
    fc.stringMatching(/^[a-z]{3,8}$/),
    fc.constantFrom('com', 'de', 'org', 'net')
  ).map(([local, domain, tld]) => `prop-session-${local}@${domain}.${tld}`);

// Helper to generate valid passwords (≥8 chars, at least one letter and one number)
const validPasswordArbitrary = () =>
  fc.tuple(
    fc.stringMatching(/^[a-zA-Z]{4,10}$/),
    fc.stringMatching(/^[0-9]{4,10}$/)
  ).map(([letters, numbers]) => letters + numbers);

describe('SessionService Property Tests', () => {
  const testAccountIds: string[] = [];

  afterAll(async () => {
    // Clean up test accounts (sessions will cascade delete)
    if (testAccountIds.length > 0) {
      await prisma.account.deleteMany({
        where: { id: { in: testAccountIds } },
      });
    }
    await prisma.$disconnect();
  });

  describe('Property 1: JWT expiry is 7 days from issuance', () => {
    /**
     * **Validates: Requirements 3.2**
     * For any successfully created session token, the decoded JWT's
     * `exp` claim minus its `iat` claim should equal 604800 seconds (7 days).
     */
    it('token exp - iat equals 604800 seconds (7 days)', async () => {
      await fc.assert(
        fc.asyncProperty(
          testEmailArbitrary(),
          validPasswordArbitrary(),
          async (email, password) => {
            // Create a test account
            const account = await accountService.register({ email, password });
            testAccountIds.push(account.id);

            // Create a session and get the JWT token
            const token = await sessionService.createSession(account.id);

            // Decode the token to inspect claims
            const decoded = jwt.verify(token, config.jwt.secret) as {
              accountId: string;
              sessionId: string;
              iat: number;
              exp: number;
            };

            const SEVEN_DAYS_IN_SECONDS = 604800;
            return decoded.exp - decoded.iat === SEVEN_DAYS_IN_SECONDS;
          }
        ),
        { numRuns: 3 }
      );
    });
  });

  describe('Property 2: Login creates a session record', () => {
    /**
     * **Validates: Requirements 3.4**
     * For any valid account credentials, after a successful login call,
     * a new Session record should exist in the database with the matching
     * accountId, and the total session count for that account should have
     * increased by one.
     */
    it('createSession creates a session record with correct accountId', async () => {
      await fc.assert(
        fc.asyncProperty(
          testEmailArbitrary(),
          validPasswordArbitrary(),
          async (email, password) => {
            // Create a test account
            const account = await accountService.register({ email, password });
            testAccountIds.push(account.id);

            // Count sessions before login (should be 0)
            const sessionsBefore = await prisma.session.count({
              where: { accountId: account.id },
            });
            expect(sessionsBefore).toBe(0);

            // Simulate login by creating a session
            await sessionService.createSession(account.id);

            // Count sessions after login (should be 1)
            const sessionsAfter = await prisma.session.count({
              where: { accountId: account.id },
            });
            expect(sessionsAfter).toBe(sessionsBefore + 1);

            // Verify the session record has the correct accountId
            const sessions = await prisma.session.findMany({
              where: { accountId: account.id },
            });
            expect(sessions).toHaveLength(1);
            expect(sessions[0].accountId).toBe(account.id);
          }
        ),
        { numRuns: 3 }
      );
    });
  });

  describe('Property 3: Logout-all removes all sessions', () => {
    /**
     * **Validates: Requirements 4.2**
     * For any account with one or more active sessions, calling
     * `deleteAllSessions` should result in zero sessions remaining
     * for that account in the database.
     */
    it('deleteAllSessions removes all sessions for an account', async () => {
      await fc.assert(
        fc.asyncProperty(
          testEmailArbitrary(),
          validPasswordArbitrary(),
          fc.integer({ min: 1, max: 5 }),
          async (email, password, numSessions) => {
            // Create a test account
            const account = await accountService.register({ email, password });
            testAccountIds.push(account.id);

            // Create N sessions for the account
            for (let i = 0; i < numSessions; i++) {
              await sessionService.createSession(account.id);
            }

            // Verify sessions were created
            const sessionsBeforeDelete = await prisma.session.count({
              where: { accountId: account.id },
            });
            expect(sessionsBeforeDelete).toBe(numSessions);

            // Delete all sessions
            await sessionService.deleteAllSessions(account.id);

            // Verify zero sessions remain
            const sessionsAfterDelete = await prisma.session.count({
              where: { accountId: account.id },
            });
            expect(sessionsAfterDelete).toBe(0);
          }
        ),
        { numRuns: 3 }
      );
    });
  });

  describe('Property 4: Password change invalidates other sessions', () => {
    /**
     * **Validates: Requirements 4.4**
     * For any account with multiple active sessions, changing the password
     * should delete all sessions except the current session. The current
     * session should remain valid, and all other sessions should no longer exist.
     */
    it('deleteAllSessionsExcept keeps only the current session', async () => {
      await fc.assert(
        fc.asyncProperty(
          testEmailArbitrary(),
          validPasswordArbitrary(),
          fc.integer({ min: 2, max: 5 }),
          async (email, password, totalSessions) => {
            // Create a test account
            const account = await accountService.register({ email, password });
            testAccountIds.push(account.id);

            // Create multiple sessions and collect their IDs
            const sessionIds: string[] = [];
            for (let i = 0; i < totalSessions; i++) {
              const token = await sessionService.createSession(account.id);
              const decoded = jwt.verify(token, config.jwt.secret) as {
                sessionId: string;
              };
              sessionIds.push(decoded.sessionId);
            }

            // Verify all sessions were created
            const sessionsBeforeDelete = await prisma.session.count({
              where: { accountId: account.id },
            });
            expect(sessionsBeforeDelete).toBe(totalSessions);

            // Pick the first session as the "current" session (the one to keep)
            const currentSessionId = sessionIds[0];

            // Simulate password change: delete all sessions except current
            await sessionService.deleteAllSessionsExcept(account.id, currentSessionId);

            // Verify only the current session remains
            const remainingSessions = await prisma.session.findMany({
              where: { accountId: account.id },
            });
            expect(remainingSessions).toHaveLength(1);
            expect(remainingSessions[0].id).toBe(currentSessionId);

            // Verify all other sessions are deleted
            for (let i = 1; i < sessionIds.length; i++) {
              const deletedSession = await prisma.session.findUnique({
                where: { id: sessionIds[i] },
              });
              expect(deletedSession).toBeNull();
            }
          }
        ),
        { numRuns: 3 }
      );
    });
  });
});
