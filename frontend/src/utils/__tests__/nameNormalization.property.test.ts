/**
 * Property-based tests for name normalization
 * **Property 7: Name Normalization Idempotence**
 * **Validates: Requirements 5.6**
 * 
 * Feature: 011-fuzzy-search
 * **Property 1: Punctuation Normalization Completeness**
 * **Validates: Requirements 1.2**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { normalizeName, normalizePunctuation, tokenize } from '../nameNormalization';

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


describe('normalizePunctuation', () => {
  /**
   * Feature: 011-fuzzy-search
   * Property 1: Punctuation Normalization Completeness
   * For any string containing punctuation characters (colons, hyphens, apostrophes, periods, commas),
   * the normalizePunctuation function SHALL return a string with all those punctuation characters removed.
   * **Validates: Requirements 1.2**
   */
  describe('Property 1: Punctuation Normalization Completeness', () => {
    const punctuationChars = [':', '-', "'", '.', ','];

    it('removes all target punctuation characters from any string', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const result = normalizePunctuation(input);
          // Result should not contain any of the target punctuation
          for (const char of punctuationChars) {
            expect(result).not.toContain(char);
          }
        }),
        { numRuns: 20 }
      );
    });

    it('normalizing punctuation twice produces the same result as once (idempotence)', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const normalizedOnce = normalizePunctuation(input);
          const normalizedTwice = normalizePunctuation(normalizedOnce);
          expect(normalizedTwice).toBe(normalizedOnce);
        }),
        { numRuns: 20 }
      );
    });

    it('result is always lowercase with no extra whitespace', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const result = normalizePunctuation(input);
          expect(result).toBe(result.toLowerCase());
          expect(result).toBe(result.trim());
          expect(result).not.toMatch(/\s{2,}/);
        }),
        { numRuns: 20 }
      );
    });
  });
});

describe('tokenize', () => {
  describe('Property: Tokenization correctness', () => {
    it('returns empty array for empty or whitespace-only strings', () => {
      fc.assert(
        fc.property(
          fc.stringOf(fc.constantFrom(' ', '\t', '\n', '')),
          (whitespace) => {
            const result = tokenize(whitespace);
            expect(result).toEqual([]);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('tokens contain no whitespace', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const tokens = tokenize(input);
          for (const token of tokens) {
            expect(token).not.toMatch(/\s/);
            expect(token.length).toBeGreaterThan(0);
          }
        }),
        { numRuns: 20 }
      );
    });

    it('joining tokens with space produces normalized result', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const tokens = tokenize(normalizeName(input));
          const rejoined = tokens.join(' ');
          expect(rejoined).toBe(normalizeName(input));
        }),
        { numRuns: 20 }
      );
    });
  });
});


describe('normalizePunctuation - Unit tests', () => {
  it('removes colons from game names', () => {
    expect(normalizePunctuation('Brass: Birmingham')).toBe('brass birmingham');
    expect(normalizePunctuation('Catan: Seafarers')).toBe('catan seafarers');
    expect(normalizePunctuation('Star Wars: Rebellion')).toBe('star wars rebellion');
  });

  it('removes hyphens from game names', () => {
    expect(normalizePunctuation('Ticket-to-Ride')).toBe('tickettoride');
    expect(normalizePunctuation('A-B-C')).toBe('abc');
  });

  it('removes apostrophes from game names', () => {
    expect(normalizePunctuation("Rock'n'Roll")).toBe('rocknroll');
    expect(normalizePunctuation("It's a game")).toBe('its a game');
  });

  it('removes periods and commas', () => {
    expect(normalizePunctuation('Dr. Who')).toBe('dr who');
    expect(normalizePunctuation('Hello, World')).toBe('hello world');
  });

  it('handles multiple punctuation types', () => {
    expect(normalizePunctuation("Game: Sub-title, Vol. 2")).toBe('game subtitle vol 2');
  });

  it('handles empty string', () => {
    expect(normalizePunctuation('')).toBe('');
  });

  it('handles string with only punctuation', () => {
    expect(normalizePunctuation('::--..,,')).toBe('');
  });

  it('preserves other special characters', () => {
    // Ampersand, numbers, etc. should be preserved
    expect(normalizePunctuation('Catan & Knights')).toBe('catan & knights');
    expect(normalizePunctuation('7 Wonders')).toBe('7 wonders');
  });
});

describe('tokenize - Unit tests', () => {
  it('splits normalized strings into words', () => {
    expect(tokenize('brass birmingham')).toEqual(['brass', 'birmingham']);
    expect(tokenize('catan')).toEqual(['catan']);
  });

  it('handles empty string', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('handles whitespace-only string', () => {
    expect(tokenize('   ')).toEqual([]);
    expect(tokenize('\t\n')).toEqual([]);
  });

  it('handles multiple spaces between words', () => {
    expect(tokenize('multiple   spaces')).toEqual(['multiple', 'spaces']);
  });

  it('handles leading and trailing whitespace', () => {
    expect(tokenize('  word  ')).toEqual(['word']);
  });
});
