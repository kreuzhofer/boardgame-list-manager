import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from '@jest/globals';
import * as fc from 'fast-check';
import { ParticipantService, MAX_USERNAME_LENGTH } from '../participant.service';
import { prisma } from '../../db/prisma';

/**
 * Property-based tests for ParticipantService
 *
 * These tests verify correctness properties using fast-check to generate
 * random inputs and ensure the properties hold across all valid inputs.
 *
 * Feature: 002-participant-management
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

describe('ParticipantService Property Tests', () => {
  let participantService: ParticipantService;
  let eventId: string;
  const createdParticipantIds: string[] = [];
  const createdAccountIds: string[] = [];

  beforeAll(async () => {
    const email = `participant-service-${Date.now()}@example.com`;
    const account = await prisma.account.create({
      data: {
        email,
        passwordHash: 'test-hash',
        role: 'account_owner',
        status: 'active',
      },
    });
    createdAccountIds.push(account.id);

    const event = await prisma.event.create({
      data: {
        name: `Participant Service Test ${Date.now()}`,
        passwordHash: 'test-hash',
        ownerAccountId: account.id,
      },
    });
    eventId = event.id;
  });

  beforeEach(() => {
    participantService = new ParticipantService();
  });

  afterEach(async () => {
    // Clean up created participants after each test
    if (createdParticipantIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdParticipantIds } },
      });
      createdParticipantIds.length = 0;
    }
  });

  afterAll(async () => {
    if (createdAccountIds.length > 0) {
      await prisma.account.deleteMany({
        where: { id: { in: createdAccountIds } },
      });
    }
    // Ensure cleanup and disconnect
    await prisma.$disconnect();
  });

  /**
   * Property 2: Whitespace-Only Names Are Rejected
   * **Validates: Requirements 1.2, 3.5, 3.8**
   *
   * *For any* string composed entirely of whitespace characters (spaces, tabs, newlines),
   * attempting to create or update a participant with that name SHALL be rejected with a
   * 400 validation error.
   *
   * Feature: 002-participant-management, Property 2: Whitespace-Only Names Are Rejected
   */
  describe('Property 2: Whitespace-Only Names Are Rejected', () => {
    /**
     * Test that createParticipant rejects whitespace-only names
     * **Validates: Requirements 1.2, 3.5**
     */
    it('should reject whitespace-only names when creating a participant', async () => {
      await fc.assert(
        fc.asyncProperty(whitespaceOnlyArbitrary, async (whitespaceOnlyName) => {
          // Property: Creating a participant with a whitespace-only name should throw
          // the German validation error message
          await expect(participantService.createParticipant(whitespaceOnlyName, eventId)).rejects.toThrow(
            'Bitte einen Namen eingeben.'
          );

          return true;
        }),
        { numRuns: 3 } // Per workspace guidelines for service tests
      );
    });

    /**
     * Test that updateParticipant rejects whitespace-only names
     * **Validates: Requirements 1.2, 3.8**
     */
    it('should reject whitespace-only names when updating a participant', async () => {
      // First, create a valid participant to update (max 30 chars)
      const random = Math.random().toString(36).slice(2, 8);
      const validParticipant = await participantService.createParticipant(`TU_${random}`, eventId);
      createdParticipantIds.push(validParticipant.id);

      await fc.assert(
        fc.asyncProperty(whitespaceOnlyArbitrary, async (whitespaceOnlyName) => {
          // Property: Updating a participant with a whitespace-only name should throw
          // the German validation error message
          await expect(participantService.updateParticipant(validParticipant.id, whitespaceOnlyName, eventId)).rejects.toThrow(
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
    it('should reject empty string when creating a participant', async () => {
      await expect(participantService.createParticipant('', eventId)).rejects.toThrow('Bitte einen Namen eingeben.');
    });

    it('should reject empty string when updating a participant', async () => {
      // First, create a valid participant to update (max 30 chars)
      const random = Math.random().toString(36).slice(2, 8);
      const validParticipant = await participantService.createParticipant(`TU_${random}`, eventId);
      createdParticipantIds.push(validParticipant.id);

      await expect(participantService.updateParticipant(validParticipant.id, '', eventId)).rejects.toThrow(
        'Bitte einen Namen eingeben.'
      );
    });
  });

  /**
   * Property 3: Backend Rejects Oversized Names
   * **Validates: Requirements 2.1, 2.2**
   *
   * *For any* string with trimmed length greater than 30 characters, both `createParticipant`
   * and `updateParticipant` SHALL reject the request with the German error message
   * "Der Name darf maximal 30 Zeichen lang sein."
   *
   * Feature: 009-username-length-limit, Property 3: Backend Rejects Oversized Names
   */
  describe('Property 3: Backend Rejects Oversized Names', () => {
    /**
     * Test that createParticipant rejects names exceeding MAX_USERNAME_LENGTH
     * **Validates: Requirements 2.1**
     */
    it('should reject oversized names when creating a participant', async () => {
      await fc.assert(
        fc.asyncProperty(oversizedNameArbitrary, async (oversizedName) => {
          // Property: Creating a participant with a name > 30 characters should throw
          // the German validation error message
          await expect(participantService.createParticipant(oversizedName, eventId)).rejects.toThrow(
            'Der Name darf maximal 30 Zeichen lang sein.'
          );

          return true;
        }),
        { numRuns: 5 } // Per workspace guidelines for DB operations
      );
    });

    /**
     * Test that updateParticipant rejects names exceeding MAX_USERNAME_LENGTH
     * **Validates: Requirements 2.2**
     */
    it('should reject oversized names when updating a participant', async () => {
      // First, create a valid participant to update (max 30 chars)
      const random = Math.random().toString(36).slice(2, 8);
      const validParticipant = await participantService.createParticipant(`TU_${random}`, eventId);
      createdParticipantIds.push(validParticipant.id);

      await fc.assert(
        fc.asyncProperty(oversizedNameArbitrary, async (oversizedName) => {
          // Property: Updating a participant with a name > 30 characters should throw
          // the German validation error message
          await expect(participantService.updateParticipant(validParticipant.id, oversizedName, eventId)).rejects.toThrow(
            'Der Name darf maximal 30 Zeichen lang sein.'
          );

          return true;
        }),
        { numRuns: 5 } // Per workspace guidelines for DB operations
      );
    });
  });
});
