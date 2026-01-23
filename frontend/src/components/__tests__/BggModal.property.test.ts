/**
 * Property-based tests for BggModal component
 * Feature: bgg-static-data-integration
 * Property 13: BGG Modal Iframe URL
 * **Validates: Requirements 7.3**
 */

import * as fc from 'fast-check';
import { getBggUrl } from '../BggModal';

describe('BggModal Property Tests', () => {
  describe('Property 13: BGG Modal Iframe URL', () => {
    it('should generate correct BGG URL format for any bggId', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 999999 }),
          (bggId) => {
            const url = getBggUrl(bggId);
            return url === `https://boardgamegeek.com/boardgame/${bggId}`;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should always start with https://boardgamegeek.com/boardgame/', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 999999 }),
          (bggId) => {
            const url = getBggUrl(bggId);
            return url.startsWith('https://boardgamegeek.com/boardgame/');
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should end with the bggId', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 999999 }),
          (bggId) => {
            const url = getBggUrl(bggId);
            return url.endsWith(String(bggId));
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should produce valid URL structure', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 999999 }),
          (bggId) => {
            const url = getBggUrl(bggId);
            // URL should be parseable
            try {
              const parsed = new URL(url);
              return (
                parsed.protocol === 'https:' &&
                parsed.hostname === 'boardgamegeek.com' &&
                parsed.pathname === `/boardgame/${bggId}`
              );
            } catch {
              return false;
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
