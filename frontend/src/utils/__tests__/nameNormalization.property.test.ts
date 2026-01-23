/**
 * Property-based tests for name normalization
 * **Property 7: Name Normalization Idempotence**
 * **Validates: Requirements 5.6**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { normalizeName } from '../nameNormalization';

describe('normalizeName', () => {
  describe('Property 7: Name Normalization Idempotence', () => {
    it('normalizing twice produces the same result as normalizing once (idempotence)', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const normalizedOnce = normalizeName(input);
          const normalizedTwice = normalizeName(normalizedOnce);
          expect(normalizedTwice).toBe(normalizedOnce);
        }),
        { numRuns: 20 }
      );
    });

    it('normalized result is always lowercase', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const normalized = normalizeName(input);
          expect(normalized).toBe(normalized.toLowerCase());
        }),
        { numRuns: 20 }
      );
    });

    it('normalized result has no leading or trailing whitespace', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const normalized = normalizeName(input);
          expect(normalized).toBe(normalized.trim());
        }),
        { numRuns: 20 }
      );
    });

    it('normalized result has no consecutive spaces', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const normalized = normalizeName(input);
          expect(normalized).not.toMatch(/\s{2,}/);
        }),
        { numRuns: 20 }
      );
    });
  });

  describe('Unit tests for specific examples', () => {
    it('converts to lowercase', () => {
      expect(normalizeName('CATAN')).toBe('catan');
      expect(normalizeName('Catan')).toBe('catan');
    });

    it('trims whitespace', () => {
      expect(normalizeName('  Catan  ')).toBe('catan');
      expect(normalizeName('\tCatan\n')).toBe('catan');
    });

    it('collapses multiple spaces', () => {
      expect(normalizeName('Catan   Junior')).toBe('catan junior');
      expect(normalizeName('Catan  Cities  &  Knights')).toBe('catan cities & knights');
    });

    it('handles empty string', () => {
      expect(normalizeName('')).toBe('');
    });

    it('handles string with only whitespace', () => {
      expect(normalizeName('   ')).toBe('');
    });
  });
});
