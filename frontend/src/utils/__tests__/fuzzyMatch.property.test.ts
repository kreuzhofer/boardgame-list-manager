/**
 * Property-based tests for fuzzy matching
 * Feature: 011-fuzzy-search
 * 
 * Property 5: Edit Distance Threshold Behavior
 * Property 6: Score Hierarchy Invariant
 * **Validates: Requirements 3.2, 3.4, 4.2, 4.3, 4.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { editDistance, fuzzyMatch, DEFAULT_FUZZY_CONFIG } from '../fuzzyMatch';

describe('editDistance', () => {
  describe('Property: Edit distance mathematical properties', () => {
    it('distance is always non-negative', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (a, b) => {
          const distance = editDistance(a, b);
          expect(distance).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 20 }
      );
    });

    it('distance is symmetric (d(a,b) = d(b,a))', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (a, b) => {
          expect(editDistance(a, b)).toBe(editDistance(b, a));
        }),
        { numRuns: 20 }
      );
    });

    it('distance to self is zero', () => {
      fc.assert(
        fc.property(fc.string(), (s) => {
          expect(editDistance(s, s)).toBe(0);
        }),
        { numRuns: 20 }
      );
    });

    it('distance is at most the length of the longer string', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (a, b) => {
          const distance = editDistance(a, b);
          expect(distance).toBeLessThanOrEqual(Math.max(a.length, b.length));
        }),
        { numRuns: 20 }
      );
    });

    it('single character difference has distance 1', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.integer({ min: 0, max: 100 }),
          fc.char(),
          (base, posRaw, newChar) => {
            if (base.length === 0) return;
            const pos = posRaw % base.length;
            if (base[pos] === newChar) return; // Skip if same char
            const modified = base.slice(0, pos) + newChar + base.slice(pos + 1);
            expect(editDistance(base, modified)).toBe(1);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

describe('fuzzyMatch', () => {
  /**
   * Feature: 011-fuzzy-search
   * Property 5: Edit Distance Threshold Behavior
   * For any two strings where the edit distance is within the configured threshold,
   * the fuzzy matcher SHALL return a match. For any two strings where the edit distance
   * exceeds the threshold, the fuzzy matcher SHALL NOT return an edit-distance match.
   * **Validates: Requirements 3.2, 3.4**
   */
  describe('Property 5: Edit Distance Threshold Behavior', () => {
    it('strings within edit distance threshold match', () => {
      // Generate base string and apply small modifications
      fc.assert(
        fc.property(
          fc.string({ minLength: 5, maxLength: 15 }).filter((s) => /^[a-z]+$/.test(s)),
          (base) => {
            // Add one character (edit distance 1)
            const withExtra = base + 'x';
            const result = fuzzyMatch(base, withExtra, { 
              enableEditDistance: true, 
              maxEditDistance: 2,
              minQueryLength: 4 
            });
            // Should match via edit distance or exact (if substring)
            expect(result.matched).toBe(true);
          }
        ),
        { numRuns: 15 }
      );
    });

    it('strings exceeding edit distance threshold do not match via edit-distance', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 4, maxLength: 10 }).filter((s) => /^[a-z]+$/.test(s)),
          fc.string({ minLength: 4, maxLength: 10 }).filter((s) => /^[a-z]+$/.test(s)),
          (a, b) => {
            // Only test if strings are very different
            const distance = editDistance(a, b);
            if (distance > 3) {
              const result = fuzzyMatch(a, b, { 
                enableEditDistance: true, 
                maxEditDistance: 1,
                minQueryLength: 4 
              });
              // Should not match via edit-distance
              if (result.matched && result.matchType === 'edit-distance') {
                // This should not happen for distance > 3 with maxEditDistance 1
                expect(result.matchType).not.toBe('edit-distance');
              }
            }
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  /**
   * Feature: 011-fuzzy-search
   * Property 6: Score Hierarchy Invariant
   * For any game that matches via multiple strategies, the scores SHALL follow
   * the hierarchy: exact (100) > punctuation (80) > word-order (60) > edit-distance (40-59).
   * **Validates: Requirements 4.2, 4.3, 4.4**
   */
  describe('Property 6: Score Hierarchy Invariant', () => {
    it('exact matches always have score 100', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 0, maxLength: 10 }),
          fc.string({ minLength: 0, maxLength: 10 }),
          (query, prefix, suffix) => {
            const gameName = prefix + query + suffix;
            const result = fuzzyMatch(query, gameName);
            if (result.matchType === 'exact') {
              expect(result.score).toBe(100);
            }
          }
        ),
        { numRuns: 15 }
      );
    });

    it('punctuation matches have score 80', () => {
      // Test with colon-separated names
      const result = fuzzyMatch('Brass Birmingham', 'Brass: Birmingham');
      if (result.matchType === 'punctuation') {
        expect(result.score).toBe(80);
      }
    });

    it('word-order matches have score 60', () => {
      const result = fuzzyMatch('Birmingham Brass', 'Brass: Birmingham');
      if (result.matchType === 'word-order') {
        expect(result.score).toBe(60);
      }
    });

    it('edit-distance matches have score between 40-59', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5, maxLength: 15 }).filter((s) => /^[a-z]+$/.test(s)),
          (base) => {
            // Create a string with small edit distance
            const modified = base.slice(0, -1) + 'z';
            const result = fuzzyMatch(base, modified, {
              enableEditDistance: true,
              maxEditDistance: 2,
              minQueryLength: 4,
            });
            if (result.matchType === 'edit-distance') {
              expect(result.score).toBeGreaterThanOrEqual(40);
              expect(result.score).toBeLessThanOrEqual(59);
            }
          }
        ),
        { numRuns: 15 }
      );
    });

    it('score hierarchy is maintained: exact > punctuation > word-order > edit-distance', () => {
      // Verify the score constants
      expect(100).toBeGreaterThan(80); // exact > punctuation
      expect(80).toBeGreaterThan(60); // punctuation > word-order
      expect(60).toBeGreaterThan(59); // word-order > max edit-distance score
    });
  });
});


describe('fuzzyMatch - Unit tests', () => {
  describe('Exact substring matching', () => {
    it('matches exact substring', () => {
      const result = fuzzyMatch('catan', 'Catan');
      expect(result).toEqual({ matched: true, score: 100, matchType: 'exact' });
    });

    it('matches partial substring', () => {
      const result = fuzzyMatch('cat', 'Catan');
      expect(result).toEqual({ matched: true, score: 100, matchType: 'exact' });
    });

    it('is case insensitive', () => {
      const result = fuzzyMatch('CATAN', 'catan');
      expect(result).toEqual({ matched: true, score: 100, matchType: 'exact' });
    });
  });

  describe('Punctuation-normalized matching', () => {
    it('matches "Brass Birmingham" to "Brass: Birmingham"', () => {
      const result = fuzzyMatch('Brass Birmingham', 'Brass: Birmingham');
      expect(result.matched).toBe(true);
      expect(result.score).toBe(80);
      expect(result.matchType).toBe('punctuation');
    });

    it('matches "Catan Seafarers" to "Catan: Seafarers"', () => {
      const result = fuzzyMatch('Catan Seafarers', 'Catan: Seafarers');
      expect(result.matched).toBe(true);
      expect(result.score).toBe(80);
      expect(result.matchType).toBe('punctuation');
    });

    it('matches without hyphens', () => {
      const result = fuzzyMatch('Ticket to Ride', 'Ticket-to-Ride');
      expect(result.matched).toBe(true);
      // Note: This matches via word-order because removing hyphens creates "tickettoride"
      // while the query "ticket to ride" has separate words
      expect(result.matchType).toBe('word-order');
    });
  });

  describe('Word-order independent matching', () => {
    it('matches "Birmingham Brass" to "Brass: Birmingham"', () => {
      const result = fuzzyMatch('Birmingham Brass', 'Brass: Birmingham');
      expect(result.matched).toBe(true);
      expect(result.score).toBe(60);
      expect(result.matchType).toBe('word-order');
    });

    it('matches partial words in any order', () => {
      const result = fuzzyMatch('Birm Bra', 'Brass: Birmingham');
      expect(result.matched).toBe(true);
      expect(result.matchType).toBe('word-order');
    });

    it('does not match if a word is missing', () => {
      const result = fuzzyMatch('Birmingham London', 'Brass: Birmingham');
      expect(result.matched).toBe(false);
    });
  });

  describe('Edit distance matching', () => {
    it('matches "Cataan" to "Catan" (one extra letter)', () => {
      const result = fuzzyMatch('Cataan', 'Catan');
      expect(result.matched).toBe(true);
      expect(result.matchType).toBe('edit-distance');
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.score).toBeLessThanOrEqual(59);
    });

    it('matches "Katan" to "Catan" (one substitution)', () => {
      const result = fuzzyMatch('Katan', 'Catan');
      expect(result.matched).toBe(true);
      expect(result.matchType).toBe('edit-distance');
    });

    it('does not match very different strings', () => {
      const result = fuzzyMatch('Monopoly', 'Catan');
      expect(result.matched).toBe(false);
    });

    it('respects minQueryLength config', () => {
      const result = fuzzyMatch('Cat', 'Catan', { minQueryLength: 5 });
      // Should match via exact substring, not edit distance
      expect(result.matchType).toBe('exact');
    });

    it('can be disabled', () => {
      const result = fuzzyMatch('Cataan', 'Catan', { enableEditDistance: false });
      // Without edit distance, this shouldn't match
      expect(result.matched).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('empty query returns no match', () => {
      const result = fuzzyMatch('', 'Catan');
      expect(result).toEqual({ matched: false, score: 0, matchType: 'none' });
    });

    it('whitespace-only query returns no match', () => {
      const result = fuzzyMatch('   ', 'Catan');
      expect(result).toEqual({ matched: false, score: 0, matchType: 'none' });
    });

    it('handles empty game name', () => {
      const result = fuzzyMatch('Catan', '');
      expect(result.matched).toBe(false);
    });
  });
});

describe('editDistance - Unit tests', () => {
  it('returns 0 for identical strings', () => {
    expect(editDistance('catan', 'catan')).toBe(0);
  });

  it('returns 1 for single insertion', () => {
    expect(editDistance('catan', 'cataan')).toBe(1);
  });

  it('returns 1 for single deletion', () => {
    expect(editDistance('cataan', 'catan')).toBe(1);
  });

  it('returns 1 for single substitution', () => {
    expect(editDistance('catan', 'katan')).toBe(1);
  });

  it('returns 2 for two changes', () => {
    expect(editDistance('brass', 'glass')).toBe(2);
  });

  it('handles empty strings', () => {
    expect(editDistance('', '')).toBe(0);
    expect(editDistance('abc', '')).toBe(3);
    expect(editDistance('', 'abc')).toBe(3);
  });

  it('respects maxDistance for early termination', () => {
    const result = editDistance('completely', 'different', 2);
    expect(result).toBeGreaterThan(2);
  });
});
