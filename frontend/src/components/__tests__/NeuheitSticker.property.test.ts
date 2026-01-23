/**
 * Property-based tests for NeuheitSticker component
 * Feature: bgg-static-data-integration
 * Property 10: Neuheit Sticker Display Logic
 * **Validates: Requirements 5.1**
 */

import * as fc from 'fast-check';
import { isNeuheit } from '../NeuheitSticker';

describe('NeuheitSticker Property Tests', () => {
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  describe('Property 10: Neuheit Sticker Display Logic', () => {
    it('should return true for current year', () => {
      fc.assert(
        fc.property(fc.constant(currentYear), (year) => {
          return isNeuheit(year) === true;
        }),
        { numRuns: 3 }
      );
    });

    it('should return true for previous year', () => {
      fc.assert(
        fc.property(fc.constant(previousYear), (year) => {
          return isNeuheit(year) === true;
        }),
        { numRuns: 3 }
      );
    });

    it('should return false for years older than previous year', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1900, max: previousYear - 1 }),
          (year) => {
            return isNeuheit(year) === false;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should return false for future years', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: currentYear + 1, max: currentYear + 100 }),
          (year) => {
            return isNeuheit(year) === false;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should return false for null yearPublished', () => {
      expect(isNeuheit(null)).toBe(false);
    });

    it('should only show for current or previous year (comprehensive property)', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null as number | null),
            fc.integer({ min: 1900, max: currentYear + 10 })
          ),
          (yearPublished) => {
            const result = isNeuheit(yearPublished);
            const expected =
              yearPublished !== null &&
              (yearPublished === currentYear || yearPublished === previousYear);
            return result === expected;
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
