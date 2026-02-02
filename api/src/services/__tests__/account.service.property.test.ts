import * as fc from 'fast-check';
import { PrismaClient } from '@prisma/client';
import { AccountService } from '../account.service';

const prisma = new PrismaClient();
const accountService = new AccountService(prisma);

// Helper to generate test emails
const testEmailArbitrary = () =>
  fc.tuple(
    fc.stringMatching(/^[a-z]{5,10}$/),
    fc.stringMatching(/^[a-z]{3,8}$/),
    fc.constantFrom('com', 'de', 'org', 'net')
  ).map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

describe('AccountService Property Tests', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Property 1: Password Validation', () => {
    /**
     * **Validates: Requirements 1.3, 2.2**
     * Password accepted iff ≥8 chars AND has letter AND has number
     */
    it('accepts password iff it has ≥8 chars, at least one letter, and at least one number', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 30 }), (password) => {
          const hasMinLength = password.length >= 8;
          const hasLetter = /[a-zA-Z]/.test(password);
          const hasNumber = /[0-9]/.test(password);
          const shouldBeValid = hasMinLength && hasLetter && hasNumber;

          const isValid = accountService.isPasswordValid(password);

          return isValid === shouldBeValid;
        }),
        { numRuns: 20 }
      );
    });

    it('rejects passwords shorter than 8 characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 7 }),
          (password) => {
            return !accountService.isPasswordValid(password);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('rejects passwords without letters', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[0-9!@#$%^&*()]{8,20}$/),
          (password) => {
            return !accountService.isPasswordValid(password);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('rejects passwords without numbers', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-zA-Z!@#$%^&*()]{8,20}$/),
          (password) => {
            return !accountService.isPasswordValid(password);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('accepts valid passwords with letters and numbers', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.stringMatching(/^[a-zA-Z]{4,10}$/),
            fc.stringMatching(/^[0-9]{4,10}$/)
          ),
          ([letters, numbers]) => {
            const password = letters + numbers;
            return accountService.isPasswordValid(password);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 3: Password Hash Security', () => {
    /**
     * **Validates: Non-functional (bcrypt)**
     * Hash ≠ password, correct password verifies, wrong password fails
     */
    it('hash is never equal to the original password', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9]{8,20}$/),
          async (password) => {
            const hash = await accountService.hashPassword(password);
            return hash !== password;
          }
        ),
        { numRuns: 5 }
      );
    });

    it('correct password verifies against hash', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9]{8,20}$/),
          async (password) => {
            const hash = await accountService.hashPassword(password);
            const isValid = await accountService.verifyPassword(password, hash);
            return isValid === true;
          }
        ),
        { numRuns: 5 }
      );
    });

    it('wrong password fails verification', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.stringMatching(/^[a-zA-Z0-9]{8,20}$/),
            fc.stringMatching(/^[a-zA-Z0-9]{8,20}$/)
          ).filter(([a, b]) => a !== b),
          async ([password, wrongPassword]) => {
            const hash = await accountService.hashPassword(password);
            const isValid = await accountService.verifyPassword(wrongPassword, hash);
            return isValid === false;
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe('Property 7: New Account Default Values', () => {
    /**
     * **Validates: Requirements 1.4, 5.2**
     * New accounts always have role=account_owner, status=active
     */
    const testAccountIds: string[] = [];

    afterAll(async () => {
      // Clean up test accounts
      if (testAccountIds.length > 0) {
        await prisma.account.deleteMany({
          where: { id: { in: testAccountIds } },
        });
      }
    });

    it('new accounts have role=account_owner and status=active', async () => {
      await fc.assert(
        fc.asyncProperty(
          testEmailArbitrary(),
          fc.stringMatching(/^[a-zA-Z]{4}[0-9]{4}$/),
          async (email, password) => {
            try {
              const account = await accountService.register({ email, password });
              testAccountIds.push(account.id);

              return account.role === 'account_owner' && account.status === 'active';
            } catch (error) {
              // Email might already exist from previous test run
              if ((error as Error).message.includes('bereits registriert')) {
                return true; // Skip this case
              }
              throw error;
            }
          }
        ),
        { numRuns: 3 }
      );
    });
  });
});
