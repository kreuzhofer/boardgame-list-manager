import { describe, it, expect, beforeEach, afterEach, afterAll } from '@jest/globals';
import * as fc from 'fast-check';
import { UserService, MAX_USERNAME_LENGTH } from '../user.service';
import { prisma } from '../../db/prisma';

/**
 * Property-based tests for UserService
 *
 * These tests verify correctness properties using fast-check to generate
 * random inputs and ensure the properties hold across all valid inputs.
 *
 * Feature: 002-user-management
 */

// Custom arbitrary for whitespace-only strings
// Generates strings composed entirely of whitespace characters (spaces, tabs, newlines)
const whitespaceOnlyArbitrary = fc
  .array(fc.constantFrom(' ', '\t', '\n', '\r', '\f', '\v'), { minLength: 1, maxLength: 20 })
  .map((chars) => chars.join(''));

// Custom arbitrary for oversized names (strings with trimmed length > MAX_USERNAME_LENGTH)
// Generates non-whitespace strings that exceed the 30 character limit
const oversizedNameArbitrary = fc
  .string({ minLength: MAX_USERNAME_LENGTH + 1, maxLength: 100 })
  .filter((s) => s.trim().length > MAX_USERNAME_LENGTH);

describe('UserService Property Tests', () => {
  let userService: UserService;
  const createdUserIds: string[] = [];

  beforeEach(() => {
    userService = new UserService();
  });

  afterEach(async () => {
    // Clean up created users after each test
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
      createdUserIds.length = 0;
    }
  });

  afterAll(async () => {
    // Ensure cleanup and disconnect
    await prisma.$disconnect();
  });

  /**
   * Property 2: Whitespace-Only Names Are Rejected
   * **Validates: Requirements 1.2, 3.5, 3.8**
   *
   * *For any* string composed entirely of whitespace characters (spaces, tabs, newlines),
   * attempting to create or update a user with that name SHALL be rejected with a
   * 400 validation error.
   *
   * Feature: 002-user-management, Property 2: Whitespace-Only Names Are Rejected
   */
  describe('Property 2: Whitespace-Only Names Are Rejected', () => {
    /**
     * Test that createUser rejects whitespace-only names
     * **Validates: Requirements 1.2, 3.5**
     */
    it('should reject whitespace-only names when creating a user', async () => {
      await fc.assert(
        fc.asyncProperty(whitespaceOnlyArbitrary, async (whitespaceOnlyName) => {
          // Property: Creating a user with a whitespace-only name should throw
          // the German validation error message
          await expect(userService.createUser(whitespaceOnlyName)).rejects.toThrow(
            'Bitte einen Namen eingeben.'
          );

          return true;
        }),
        { numRuns: 3 } // Per workspace guidelines for service tests
      );
    });

    /**
     * Test that updateUser rejects whitespace-only names
     * **Validates: Requirements 1.2, 3.8**
     */
    it('should reject whitespace-only names when updating a user', async () => {
      // First, create a valid user to update (max 30 chars)
      const random = Math.random().toString(36).slice(2, 8);
      const validUser = await userService.createUser(`TU_${random}`);
      createdUserIds.push(validUser.id);

      await fc.assert(
        fc.asyncProperty(whitespaceOnlyArbitrary, async (whitespaceOnlyName) => {
          // Property: Updating a user with a whitespace-only name should throw
          // the German validation error message
          await expect(userService.updateUser(validUser.id, whitespaceOnlyName)).rejects.toThrow(
            'Bitte einen Namen eingeben.'
          );

          return true;
        }),
        { numRuns: 3 } // Per workspace guidelines for service tests
      );
    });

    /**
     * Test that empty string is also rejected (edge case of whitespace-only)
     * **Validates: Requirements 1.2, 3.5, 3.8**
     */
    it('should reject empty string when creating a user', async () => {
      await expect(userService.createUser('')).rejects.toThrow('Bitte einen Namen eingeben.');
    });

    it('should reject empty string when updating a user', async () => {
      // First, create a valid user to update (max 30 chars)
      const random = Math.random().toString(36).slice(2, 8);
      const validUser = await userService.createUser(`TU_${random}`);
      createdUserIds.push(validUser.id);

      await expect(userService.updateUser(validUser.id, '')).rejects.toThrow(
        'Bitte einen Namen eingeben.'
      );
    });
  });

  /**
   * Property 3: Backend Rejects Oversized Names
   * **Validates: Requirements 2.1, 2.2**
   *
   * *For any* string with trimmed length greater than 30 characters, both `createUser`
   * and `updateUser` SHALL reject the request with the German error message
   * "Der Name darf maximal 30 Zeichen lang sein."
   *
   * Feature: 009-username-length-limit, Property 3: Backend Rejects Oversized Names
   */
  describe('Property 3: Backend Rejects Oversized Names', () => {
    /**
     * Test that createUser rejects names exceeding MAX_USERNAME_LENGTH
     * **Validates: Requirements 2.1**
     */
    it('should reject oversized names when creating a user', async () => {
      await fc.assert(
        fc.asyncProperty(oversizedNameArbitrary, async (oversizedName) => {
          // Property: Creating a user with a name > 30 characters should throw
          // the German validation error message
          await expect(userService.createUser(oversizedName)).rejects.toThrow(
            'Der Name darf maximal 30 Zeichen lang sein.'
          );

          return true;
        }),
        { numRuns: 5 } // Per workspace guidelines for DB operations
      );
    });

    /**
     * Test that updateUser rejects names exceeding MAX_USERNAME_LENGTH
     * **Validates: Requirements 2.2**
     */
    it('should reject oversized names when updating a user', async () => {
      // First, create a valid user to update (max 30 chars)
      const random = Math.random().toString(36).slice(2, 8);
      const validUser = await userService.createUser(`TU_${random}`);
      createdUserIds.push(validUser.id);

      await fc.assert(
        fc.asyncProperty(oversizedNameArbitrary, async (oversizedName) => {
          // Property: Updating a user with a name > 30 characters should throw
          // the German validation error message
          await expect(userService.updateUser(validUser.id, oversizedName)).rejects.toThrow(
            'Der Name darf maximal 30 Zeichen lang sein.'
          );

          return true;
        }),
        { numRuns: 5 } // Per workspace guidelines for DB operations
      );
    });
  });
});
