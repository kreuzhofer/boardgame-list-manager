/**
 * Property-based tests for BggImportService
 * 
 * Feature: 013-bgg-database-enrichment
 * Property 1: CSV Row Parsing Completeness
 * **Validates: Requirements 1.1**
 */

import * as fc from 'fast-check';
import { BggImportService } from '../bggImportService';

describe('BggImportService Property Tests', () => {
  const service = new BggImportService();

  /**
   * Property 1: CSV Row Parsing Completeness
   * For any valid CSV row, parsing SHALL produce a database record with all 16 columns
   * correctly mapped to their corresponding fields with appropriate types.
   */
  describe('Property 1: CSV Row Parsing Completeness', () => {
    // Arbitrary for valid CSV row
    const csvRowArbitrary = fc.record({
      id: fc.integer({ min: 1, max: 999999 }).map(String),
      name: fc.string({ minLength: 1, maxLength: 100 }),
      yearpublished: fc.oneof(
        fc.constant(''),
        fc.integer({ min: 1900, max: 2030 }).map(String)
      ),
      rank: fc.oneof(
        fc.constant(''),
        fc.integer({ min: 1, max: 200000 }).map(String)
      ),
      bayesaverage: fc.oneof(
        fc.constant(''),
        fc.float({ min: 0, max: 10, noNaN: true }).map(n => n.toFixed(5))
      ),
      average: fc.oneof(
        fc.constant(''),
        fc.float({ min: 0, max: 10, noNaN: true }).map(n => n.toFixed(5))
      ),
      usersrated: fc.oneof(
        fc.constant(''),
        fc.integer({ min: 0, max: 100000 }).map(String)
      ),
      is_expansion: fc.constantFrom('0', '1'),
      abstracts_rank: fc.oneof(fc.constant(''), fc.integer({ min: 1, max: 10000 }).map(String)),
      cgs_rank: fc.oneof(fc.constant(''), fc.integer({ min: 1, max: 10000 }).map(String)),
      childrensgames_rank: fc.oneof(fc.constant(''), fc.integer({ min: 1, max: 10000 }).map(String)),
      familygames_rank: fc.oneof(fc.constant(''), fc.integer({ min: 1, max: 10000 }).map(String)),
      partygames_rank: fc.oneof(fc.constant(''), fc.integer({ min: 1, max: 10000 }).map(String)),
      strategygames_rank: fc.oneof(fc.constant(''), fc.integer({ min: 1, max: 10000 }).map(String)),
      thematic_rank: fc.oneof(fc.constant(''), fc.integer({ min: 1, max: 10000 }).map(String)),
      wargames_rank: fc.oneof(fc.constant(''), fc.integer({ min: 1, max: 10000 }).map(String)),
    });

    it('should parse all 16 columns with correct types', () => {
      fc.assert(
        fc.property(csvRowArbitrary, (row) => {
          const parsed = service.parseRow(row);

          // Verify all fields exist
          expect(parsed).toHaveProperty('id');
          expect(parsed).toHaveProperty('name');
          expect(parsed).toHaveProperty('yearPublished');
          expect(parsed).toHaveProperty('rank');
          expect(parsed).toHaveProperty('bayesAverage');
          expect(parsed).toHaveProperty('average');
          expect(parsed).toHaveProperty('usersRated');
          expect(parsed).toHaveProperty('isExpansion');
          expect(parsed).toHaveProperty('abstractsRank');
          expect(parsed).toHaveProperty('cgsRank');
          expect(parsed).toHaveProperty('childrensGamesRank');
          expect(parsed).toHaveProperty('familyGamesRank');
          expect(parsed).toHaveProperty('partyGamesRank');
          expect(parsed).toHaveProperty('strategyGamesRank');
          expect(parsed).toHaveProperty('thematicRank');
          expect(parsed).toHaveProperty('warGamesRank');

          // Verify types
          expect(typeof parsed.id).toBe('number');
          expect(typeof parsed.name).toBe('string');
          expect(typeof parsed.isExpansion).toBe('boolean');

          // Nullable fields should be number or null
          const nullableIntFields = [
            'yearPublished', 'rank', 'usersRated',
            'abstractsRank', 'cgsRank', 'childrensGamesRank',
            'familyGamesRank', 'partyGamesRank', 'strategyGamesRank',
            'thematicRank', 'warGamesRank'
          ] as const;

          for (const field of nullableIntFields) {
            const value = parsed[field];
            expect(value === null || typeof value === 'number').toBe(true);
          }

          const nullableFloatFields = ['bayesAverage', 'average'] as const;
          for (const field of nullableFloatFields) {
            const value = parsed[field];
            expect(value === null || typeof value === 'number').toBe(true);
          }
        }),
        { numRuns: 20 }
      );
    });

    it('should correctly map id from string to integer', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 999999 }),
          (id) => {
            const row = {
              id: String(id),
              name: 'Test Game',
              yearpublished: '2020',
              rank: '1',
              bayesaverage: '8.5',
              average: '8.5',
              usersrated: '1000',
              is_expansion: '0',
              abstracts_rank: '',
              cgs_rank: '',
              childrensgames_rank: '',
              familygames_rank: '',
              partygames_rank: '',
              strategygames_rank: '',
              thematic_rank: '',
              wargames_rank: '',
            };
            const parsed = service.parseRow(row);
            expect(parsed.id).toBe(id);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should correctly parse is_expansion boolean', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('0', '1'),
          (isExpansion) => {
            const row = {
              id: '1',
              name: 'Test Game',
              yearpublished: '2020',
              rank: '1',
              bayesaverage: '8.5',
              average: '8.5',
              usersrated: '1000',
              is_expansion: isExpansion,
              abstracts_rank: '',
              cgs_rank: '',
              childrensgames_rank: '',
              familygames_rank: '',
              partygames_rank: '',
              strategygames_rank: '',
              thematic_rank: '',
              wargames_rank: '',
            };
            const parsed = service.parseRow(row);
            expect(parsed.isExpansion).toBe(isExpansion === '1');
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should handle empty strings as null for optional fields', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', '   '),
          (emptyValue) => {
            const row = {
              id: '1',
              name: 'Test Game',
              yearpublished: emptyValue,
              rank: emptyValue,
              bayesaverage: emptyValue,
              average: emptyValue,
              usersrated: emptyValue,
              is_expansion: '0',
              abstracts_rank: emptyValue,
              cgs_rank: emptyValue,
              childrensgames_rank: emptyValue,
              familygames_rank: emptyValue,
              partygames_rank: emptyValue,
              strategygames_rank: emptyValue,
              thematic_rank: emptyValue,
              wargames_rank: emptyValue,
            };
            const parsed = service.parseRow(row);
            
            // All optional fields should be null when empty
            expect(parsed.yearPublished).toBeNull();
            expect(parsed.rank).toBeNull();
            expect(parsed.bayesAverage).toBeNull();
            expect(parsed.average).toBeNull();
            expect(parsed.usersRated).toBeNull();
            expect(parsed.abstractsRank).toBeNull();
            expect(parsed.cgsRank).toBeNull();
            expect(parsed.childrensGamesRank).toBeNull();
            expect(parsed.familyGamesRank).toBeNull();
            expect(parsed.partyGamesRank).toBeNull();
            expect(parsed.strategyGamesRank).toBeNull();
            expect(parsed.thematicRank).toBeNull();
            expect(parsed.warGamesRank).toBeNull();
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});
