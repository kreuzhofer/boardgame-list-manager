import { describe, it, expect, beforeEach, afterEach, afterAll } from '@jest/globals';
import * as fc from 'fast-check';
import { UserService } from '../user.service';
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
      // First, create a valid user to update
      const validUser = await userService.createUser(
        `TestUser_${Date.now()}_${Math.random().toString(36).substring(7)}`
      );
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
      // First, create a valid user to update
      const validUser = await userService.createUser(
        `TestUser_${Date.now()}_${Math.random().toString(36).substring(7)}`
      );
      createdUserIds.push(validUser.id);

      await expect(userService.updateUser(validUser.id, '')).rejects.toThrow(
        'Bitte einen Namen eingeben.'
      );
    });
  });
});
