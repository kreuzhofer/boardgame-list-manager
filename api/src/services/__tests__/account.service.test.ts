import { PrismaClient } from '@prisma/client';
import { AccountService, AccountError } from '../account.service';
import { AccountErrorCodes } from '../../types/account';

const prisma = new PrismaClient();
const accountService = new AccountService(prisma);

describe('AccountService', () => {
  const testAccountIds: string[] = [];
  const testEventIds: string[] = [];

  afterAll(async () => {
    // Events first — otherwise cascade-delete from Account would
    // remove them and we'd lose the visibility that the cleanup
    // logic ran.
    if (testEventIds.length > 0) {
      await prisma.event.deleteMany({
        where: { id: { in: testEventIds } },
      });
    }
    if (testAccountIds.length > 0) {
      await prisma.account.deleteMany({
        where: { id: { in: testAccountIds } },
      });
    }
    await prisma.$disconnect();
  });

  describe('validatePassword', () => {
    it('throws PASSWORD_TOO_SHORT for passwords under 8 characters', () => {
      expect(() => accountService.validatePassword('short1')).toThrow(AccountError);
      try {
        accountService.validatePassword('short1');
      } catch (error) {
        expect((error as AccountError).code).toBe(AccountErrorCodes.PASSWORD_TOO_SHORT);
      }
    });

    it('throws PASSWORD_MISSING_LETTER for passwords without letters', () => {
      expect(() => accountService.validatePassword('12345678')).toThrow(AccountError);
      try {
        accountService.validatePassword('12345678');
      } catch (error) {
        expect((error as AccountError).code).toBe(AccountErrorCodes.PASSWORD_MISSING_LETTER);
      }
    });

    it('throws PASSWORD_MISSING_NUMBER for passwords without numbers', () => {
      expect(() => accountService.validatePassword('abcdefgh')).toThrow(AccountError);
      try {
        accountService.validatePassword('abcdefgh');
      } catch (error) {
        expect((error as AccountError).code).toBe(AccountErrorCodes.PASSWORD_MISSING_NUMBER);
      }
    });

    it('accepts valid passwords', () => {
      expect(() => accountService.validatePassword('password1')).not.toThrow();
      expect(() => accountService.validatePassword('Test1234')).not.toThrow();
      expect(() => accountService.validatePassword('a1b2c3d4')).not.toThrow();
    });
  });

  describe('register', () => {
    it('creates account with valid email and password', async () => {
      const email = `test-register-${Date.now()}@example.com`;
      const password = 'TestPass123';

      const account = await accountService.register({ email, password });
      testAccountIds.push(account.id);

      expect(account.email).toBe(email.toLowerCase());
      expect(account.role).toBe('account_owner');
      expect(account.status).toBe('active');
      expect(account.id).toBeDefined();
    });

    it('throws EMAIL_EXISTS for duplicate email', async () => {
      const email = `test-duplicate-${Date.now()}@example.com`;
      const password = 'TestPass123';

      const account = await accountService.register({ email, password });
      testAccountIds.push(account.id);

      await expect(accountService.register({ email, password })).rejects.toThrow(AccountError);
      try {
        await accountService.register({ email, password });
      } catch (error) {
        expect((error as AccountError).code).toBe(AccountErrorCodes.EMAIL_EXISTS);
        expect((error as AccountError).statusCode).toBe(409);
      }
    });

    it('throws INVALID_EMAIL for invalid email format', async () => {
      await expect(
        accountService.register({ email: 'invalid-email', password: 'TestPass123' })
      ).rejects.toThrow(AccountError);
    });

    it('normalizes email to lowercase', async () => {
      const email = `Test-Case-${Date.now()}@Example.COM`;
      const password = 'TestPass123';

      const account = await accountService.register({ email, password });
      testAccountIds.push(account.id);

      expect(account.email).toBe(email.toLowerCase());
    });
  });

  describe('authenticate', () => {
    let testEmail: string;
    const testPassword = 'TestPass123';

    beforeAll(async () => {
      testEmail = `test-auth-${Date.now()}@example.com`;
      const account = await accountService.register({ email: testEmail, password: testPassword });
      testAccountIds.push(account.id);
    });

    it('returns account for valid credentials', async () => {
      const account = await accountService.authenticate(testEmail, testPassword);
      expect(account.email).toBe(testEmail);
    });

    it('throws INVALID_CREDENTIALS for wrong password', async () => {
      await expect(
        accountService.authenticate(testEmail, 'WrongPass123')
      ).rejects.toThrow(AccountError);
      try {
        await accountService.authenticate(testEmail, 'WrongPass123');
      } catch (error) {
        expect((error as AccountError).code).toBe(AccountErrorCodes.INVALID_CREDENTIALS);
      }
    });

    it('throws INVALID_CREDENTIALS for non-existent email', async () => {
      await expect(
        accountService.authenticate('nonexistent@example.com', testPassword)
      ).rejects.toThrow(AccountError);
    });

    it('is case-insensitive for email', async () => {
      const account = await accountService.authenticate(testEmail.toUpperCase(), testPassword);
      expect(account.email).toBe(testEmail);
    });
  });

  describe('changePassword', () => {
    let testAccountId: string;
    let testEmail: string;
    const originalPassword = 'Original123';
    const newPassword = 'NewPass456';

    beforeAll(async () => {
      testEmail = `test-change-pwd-${Date.now()}@example.com`;
      const account = await accountService.register({ email: testEmail, password: originalPassword });
      testAccountId = account.id;
      testAccountIds.push(account.id);
    });

    it('changes password with correct current password', async () => {
      await accountService.changePassword(testAccountId, originalPassword, newPassword);

      // Should be able to authenticate with new password
      const account = await accountService.authenticate(testEmail, newPassword);
      expect(account.id).toBe(testAccountId);
    });

    it('throws WRONG_PASSWORD for incorrect current password', async () => {
      await expect(
        accountService.changePassword(testAccountId, 'WrongCurrent123', 'AnotherNew789')
      ).rejects.toThrow(AccountError);
      try {
        await accountService.changePassword(testAccountId, 'WrongCurrent123', 'AnotherNew789');
      } catch (error) {
        expect((error as AccountError).code).toBe(AccountErrorCodes.WRONG_PASSWORD);
      }
    });

    it('validates new password requirements', async () => {
      await expect(
        accountService.changePassword(testAccountId, newPassword, 'short')
      ).rejects.toThrow(AccountError);
    });
  });

  describe('deactivate', () => {
    let testAccountId: string;
    let testEmail: string;
    const testPassword = 'TestPass123';

    beforeAll(async () => {
      testEmail = `test-deactivate-${Date.now()}@example.com`;
      const account = await accountService.register({ email: testEmail, password: testPassword });
      testAccountId = account.id;
      testAccountIds.push(account.id);
    });

    it('deactivates account with correct password', async () => {
      await accountService.deactivate(testAccountId, testPassword);

      const account = await accountService.getById(testAccountId);
      expect(account?.status).toBe('deactivated');
    });

    it('prevents login after deactivation', async () => {
      await expect(
        accountService.authenticate(testEmail, testPassword)
      ).rejects.toThrow(AccountError);
      try {
        await accountService.authenticate(testEmail, testPassword);
      } catch (error) {
        expect((error as AccountError).code).toBe(AccountErrorCodes.ACCOUNT_DEACTIVATED);
      }
    });
  });

  describe('promoteToAdmin', () => {
    let adminAccountId: string;
    let regularAccountId: string;
    let targetAccountId: string;

    beforeAll(async () => {
      // Create an admin account directly in DB
      const adminEmail = `test-admin-${Date.now()}@example.com`;
      const adminAccount = await prisma.account.create({
        data: {
          email: adminEmail,
          passwordHash: await accountService.hashPassword('AdminPass123'),
          role: 'admin',
          status: 'active',
        },
      });
      adminAccountId = adminAccount.id;
      testAccountIds.push(adminAccountId);

      // Create a regular account
      const regularEmail = `test-regular-${Date.now()}@example.com`;
      const regularAccount = await accountService.register({
        email: regularEmail,
        password: 'RegularPass123',
      });
      regularAccountId = regularAccount.id;
      testAccountIds.push(regularAccountId);

      // Create target account to promote
      const targetEmail = `test-target-${Date.now()}@example.com`;
      const targetAccount = await accountService.register({
        email: targetEmail,
        password: 'TargetPass123',
      });
      targetAccountId = targetAccount.id;
      testAccountIds.push(targetAccountId);
    });

    it('allows admin to promote account', async () => {
      const promoted = await accountService.promoteToAdmin(targetAccountId, adminAccountId);
      expect(promoted.role).toBe('admin');
    });

    it('throws NOT_AUTHORIZED for non-admin promoter', async () => {
      const anotherTarget = `test-another-${Date.now()}@example.com`;
      const anotherAccount = await accountService.register({
        email: anotherTarget,
        password: 'AnotherPass123',
      });
      testAccountIds.push(anotherAccount.id);

      await expect(
        accountService.promoteToAdmin(anotherAccount.id, regularAccountId)
      ).rejects.toThrow(AccountError);
      try {
        await accountService.promoteToAdmin(anotherAccount.id, regularAccountId);
      } catch (error) {
        expect((error as AccountError).code).toBe(AccountErrorCodes.NOT_AUTHORIZED);
      }
    });
  });

  describe('getById', () => {
    it('returns account for valid ID', async () => {
      const email = `test-getbyid-${Date.now()}@example.com`;
      const created = await accountService.register({ email, password: 'TestPass123' });
      testAccountIds.push(created.id);

      const account = await accountService.getById(created.id);
      expect(account).not.toBeNull();
      expect(account?.email).toBe(email);
    });

    it('returns null for non-existent ID', async () => {
      const account = await accountService.getById('non-existent-id');
      expect(account).toBeNull();
    });
  });

  // ─── deleteAccount + transferEvents (admin destructive ops) ───────

  /**
   * Helper: create an account row directly (bypasses register's
   * email validation + default-role behaviour) so tests can build
   * specific fixtures (e.g. an admin, a deactivated player).
   */
  async function makeAccount(opts: {
    role?: 'admin' | 'account_owner' | 'player';
    status?: 'active' | 'deactivated' | 'unverified';
    label: string;
  }): Promise<{ id: string; email: string }> {
    const email = `test-${opts.label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
    const account = await prisma.account.create({
      data: {
        email,
        passwordHash: 'test-hash',
        role: opts.role ?? 'account_owner',
        status: opts.status ?? 'active',
      },
    });
    testAccountIds.push(account.id);
    return { id: account.id, email };
  }

  /** Helper: create an event owned by `ownerAccountId`. */
  async function makeEvent(ownerAccountId: string, label: string): Promise<string> {
    const event = await prisma.event.create({
      data: {
        name: `Test Event ${label} ${Date.now()}`,
        password: 'test-password',
        ownerAccountId,
      },
    });
    testEventIds.push(event.id);
    return event.id;
  }

  describe('getOwnedEvents', () => {
    it('returns owned events for the account', async () => {
      const owner = await makeAccount({ label: 'owned-list-owner' });
      const e1 = await makeEvent(owner.id, 'a');
      const e2 = await makeEvent(owner.id, 'b');

      const result = await accountService.getOwnedEvents(owner.id);

      expect(result.map((r) => r.id).sort()).toEqual([e1, e2].sort());
      expect(result[0]).toMatchObject({
        name: expect.any(String),
        status: expect.any(String),
      });
    });

    it('returns empty array when the account owns no events', async () => {
      const account = await makeAccount({ label: 'owned-empty', role: 'player' });
      const result = await accountService.getOwnedEvents(account.id);
      expect(result).toEqual([]);
    });
  });

  describe('deleteAccount', () => {
    it('hard-deletes the account row when no events are owned', async () => {
      const target = await makeAccount({ label: 'del-happy' });
      const caller = await makeAccount({ label: 'del-caller', role: 'admin' });

      await accountService.deleteAccount(target.id, caller.id);

      const found = await prisma.account.findUnique({ where: { id: target.id } });
      expect(found).toBeNull();
    });

    it('preserves per-event User rows by nulling User.accountId', async () => {
      // Reproduces the spec's central guarantee: deleting a player
      // disassociates them from their per-event User identity but
      // leaves the User (and any Player/Bringer rows it backs)
      // intact under the event scope.
      const target = await makeAccount({ label: 'del-with-user', role: 'player' });
      const caller = await makeAccount({ label: 'del-with-user-caller', role: 'admin' });

      // Need an event so we can attach a User to it. Owner is the
      // caller, not the target — target owns nothing here.
      const eventId = await makeEvent(caller.id, 'user-link');
      const user = await prisma.user.create({
        data: {
          name: 'Linked Player',
          eventId,
          accountId: target.id,
        },
      });

      await accountService.deleteAccount(target.id, caller.id);

      const survivor = await prisma.user.findUnique({ where: { id: user.id } });
      expect(survivor).not.toBeNull();
      expect(survivor!.accountId).toBeNull();

      // Cleanup the user row we created (event row gets cleaned in afterAll)
      await prisma.user.delete({ where: { id: user.id } });
    });

    it('rejects self-delete with SELF_DELETE', async () => {
      const admin = await makeAccount({ label: 'del-self', role: 'admin' });

      await expect(
        accountService.deleteAccount(admin.id, admin.id),
      ).rejects.toThrow(AccountError);
      try {
        await accountService.deleteAccount(admin.id, admin.id);
      } catch (error) {
        expect((error as AccountError).code).toBe(AccountErrorCodes.SELF_DELETE);
        expect((error as AccountError).statusCode).toBe(403);
      }
    });

    it('rejects when target still owns events with ACCOUNT_HAS_EVENTS', async () => {
      const target = await makeAccount({ label: 'del-blocked' });
      const caller = await makeAccount({ label: 'del-blocked-caller', role: 'admin' });
      await makeEvent(target.id, 'blocker');

      await expect(
        accountService.deleteAccount(target.id, caller.id),
      ).rejects.toThrow(AccountError);
      try {
        await accountService.deleteAccount(target.id, caller.id);
      } catch (error) {
        expect((error as AccountError).code).toBe(AccountErrorCodes.ACCOUNT_HAS_EVENTS);
        expect((error as AccountError).statusCode).toBe(409);
      }

      // Account must still exist after the rejected delete
      const stillThere = await prisma.account.findUnique({ where: { id: target.id } });
      expect(stillThere).not.toBeNull();
    });

    it('rejects non-existent target with ACCOUNT_NOT_FOUND', async () => {
      const caller = await makeAccount({ label: 'del-missing-caller', role: 'admin' });

      await expect(
        accountService.deleteAccount('does-not-exist', caller.id),
      ).rejects.toThrow(AccountError);
      try {
        await accountService.deleteAccount('does-not-exist', caller.id);
      } catch (error) {
        expect((error as AccountError).code).toBe(AccountErrorCodes.ACCOUNT_NOT_FOUND);
      }
    });
  });

  describe('transferEvents', () => {
    it('bulk-reassigns ownership and reports the count', async () => {
      const source = await makeAccount({ label: 'xfer-src' });
      const target = await makeAccount({ label: 'xfer-tgt' });
      const caller = await makeAccount({ label: 'xfer-caller', role: 'admin' });

      const e1 = await makeEvent(source.id, '1');
      const e2 = await makeEvent(source.id, '2');

      const result = await accountService.transferEvents(source.id, target.id, caller.id);

      expect(result.transferred).toBe(2);
      const both = await prisma.event.findMany({
        where: { id: { in: [e1, e2] } },
        select: { ownerAccountId: true },
      });
      expect(both.every((e) => e.ownerAccountId === target.id)).toBe(true);
    });

    it('promotes a player target to account_owner when transferring at least one event', async () => {
      const source = await makeAccount({ label: 'xfer-promo-src' });
      const target = await makeAccount({ label: 'xfer-promo-tgt', role: 'player' });
      const caller = await makeAccount({ label: 'xfer-promo-caller', role: 'admin' });

      await makeEvent(source.id, 'promote');

      await accountService.transferEvents(source.id, target.id, caller.id);

      const promoted = await prisma.account.findUnique({ where: { id: target.id } });
      expect(promoted!.role).toBe('account_owner');
    });

    it('does not change role when source has no events to transfer', async () => {
      const source = await makeAccount({ label: 'xfer-noop-src', role: 'player' });
      const target = await makeAccount({ label: 'xfer-noop-tgt', role: 'player' });
      const caller = await makeAccount({ label: 'xfer-noop-caller', role: 'admin' });

      const result = await accountService.transferEvents(source.id, target.id, caller.id);
      expect(result.transferred).toBe(0);

      const stillPlayer = await prisma.account.findUnique({ where: { id: target.id } });
      expect(stillPlayer!.role).toBe('player');
    });

    it('rejects target = source with SAME_TRANSFER_TARGET', async () => {
      const acc = await makeAccount({ label: 'xfer-same' });
      const caller = await makeAccount({ label: 'xfer-same-caller', role: 'admin' });

      await expect(
        accountService.transferEvents(acc.id, acc.id, caller.id),
      ).rejects.toThrow(AccountError);
      try {
        await accountService.transferEvents(acc.id, acc.id, caller.id);
      } catch (error) {
        expect((error as AccountError).code).toBe(AccountErrorCodes.SAME_TRANSFER_TARGET);
      }
    });

    it('rejects deactivated target with INVALID_TRANSFER_TARGET', async () => {
      const source = await makeAccount({ label: 'xfer-deact-src' });
      const target = await makeAccount({ label: 'xfer-deact-tgt', status: 'deactivated' });
      const caller = await makeAccount({ label: 'xfer-deact-caller', role: 'admin' });

      await expect(
        accountService.transferEvents(source.id, target.id, caller.id),
      ).rejects.toThrow(AccountError);
      try {
        await accountService.transferEvents(source.id, target.id, caller.id);
      } catch (error) {
        expect((error as AccountError).code).toBe(AccountErrorCodes.INVALID_TRANSFER_TARGET);
      }
    });

    it('rejects unverified target with INVALID_TRANSFER_TARGET', async () => {
      const source = await makeAccount({ label: 'xfer-unv-src' });
      const target = await makeAccount({ label: 'xfer-unv-tgt', status: 'unverified' });
      const caller = await makeAccount({ label: 'xfer-unv-caller', role: 'admin' });

      await expect(
        accountService.transferEvents(source.id, target.id, caller.id),
      ).rejects.toThrow(AccountError);
    });

    it('rejects non-existent target with INVALID_TRANSFER_TARGET', async () => {
      const source = await makeAccount({ label: 'xfer-missing-src' });
      const caller = await makeAccount({ label: 'xfer-missing-caller', role: 'admin' });

      await expect(
        accountService.transferEvents(source.id, 'does-not-exist', caller.id),
      ).rejects.toThrow(AccountError);
    });

    it('rejects non-existent source with ACCOUNT_NOT_FOUND', async () => {
      const target = await makeAccount({ label: 'xfer-missing-src-tgt' });
      const caller = await makeAccount({ label: 'xfer-missing-src-caller', role: 'admin' });

      await expect(
        accountService.transferEvents('does-not-exist', target.id, caller.id),
      ).rejects.toThrow(AccountError);
      try {
        await accountService.transferEvents('does-not-exist', target.id, caller.id);
      } catch (error) {
        expect((error as AccountError).code).toBe(AccountErrorCodes.ACCOUNT_NOT_FOUND);
      }
    });
  });
});
