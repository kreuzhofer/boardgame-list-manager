import { PrismaClient } from '@prisma/client';
import { AccountService, AccountError } from '../account.service';
import { AccountErrorCodes } from '../../types/account';

const prisma = new PrismaClient();
const accountService = new AccountService(prisma);

describe('AccountService', () => {
  const testAccountIds: string[] = [];

  afterAll(async () => {
    // Clean up test accounts
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
});
