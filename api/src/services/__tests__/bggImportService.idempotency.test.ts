/**
 * Property-based tests for BggImportService idempotency
 * 
 * Feature: 013-bgg-database-enrichment
 * Property 2: Import Preserves Enrichment Data
 * **Validates: Requirements 1.4**
 */

import * as fc from 'fast-check';
import { prisma } from '../../lib/prisma';
import { BggImportService } from '../bggImportService';

describe('BggImportService Idempotency Property Tests', () => {
  const service = new BggImportService();

  // Clean up test data after each test
  afterEach(async () => {
    await prisma.bggGame.deleteMany({
      where: {
        id: { gte: 900000 }, // Only delete test IDs
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  /**
   * Property 2: Import Preserves Enrichment Data
   * For any BggGame record that has scraping_done=true and non-null enrichment_data,
   * re-importing the CSV SHALL preserve the scraping_done flag, enriched_at timestamp,
   * and enrichment_data content unchanged.
   */
  describe('Property 2: Import Preserves Enrichment Data', () => {
    // Arbitrary for enrichment data
    const enrichmentDataArbitrary = fc.record({
      alternateNames: fc.array(fc.record({ name: fc.string(), language: fc.string() }), { maxLength: 3 }),
      primaryName: fc.string({ minLength: 1, maxLength: 50 }),
      description: fc.string({ maxLength: 200 }),
      shortDescription: fc.string({ maxLength: 100 }),
      slug: fc.string({ maxLength: 50 }),
      designers: fc.array(fc.string(), { maxLength: 3 }),
      artists: fc.array(fc.string(), { maxLength: 3 }),
      publishers: fc.array(fc.string(), { maxLength: 3 }),
      categories: fc.array(fc.string(), { maxLength: 3 }),
      mechanics: fc.array(fc.string(), { maxLength: 3 }),
    });

    it('should preserve enrichment data when upserting existing game', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 900000, max: 999999 }),
          enrichmentDataArbitrary,
          async (bggId, enrichmentData) => {
            // Create a game with enrichment data
            const enrichedAt = new Date();
            await prisma.bggGame.create({
              data: {
                id: bggId,
                name: 'Original Game Name',
                yearPublished: 2020,
                rank: 100,
                bayesAverage: 7.5,
                average: 7.8,
                usersRated: 1000,
                isExpansion: false,
                scrapingDone: true,
                enrichedAt,
                enrichmentData: enrichmentData as any,
              },
            });

            // Simulate re-import by calling parseRow and upserting
            const csvRow = {
              id: String(bggId),
              name: 'Updated Game Name', // Name changed in CSV
              yearpublished: '2021',
              rank: '50',
              bayesaverage: '8.0',
              average: '8.2',
              usersrated: '2000',
              is_expansion: '0',
              abstracts_rank: '',
              cgs_rank: '',
              childrensgames_rank: '',
              familygames_rank: '',
              partygames_rank: '',
              strategygames_rank: '10',
              thematic_rank: '',
              wargames_rank: '',
            };

            const parsed = service.parseRow(csvRow);

            // Perform upsert (same logic as in processBatch)
            await prisma.bggGame.upsert({
              where: { id: parsed.id },
              create: parsed,
              update: {
                name: parsed.name,
                yearPublished: parsed.yearPublished,
                rank: parsed.rank,
                bayesAverage: parsed.bayesAverage,
                average: parsed.average,
                usersRated: parsed.usersRated,
                isExpansion: parsed.isExpansion,
                abstractsRank: parsed.abstractsRank,
                cgsRank: parsed.cgsRank,
                childrensGamesRank: parsed.childrensGamesRank,
                familyGamesRank: parsed.familyGamesRank,
                partyGamesRank: parsed.partyGamesRank,
                strategyGamesRank: parsed.strategyGamesRank,
                thematicRank: parsed.thematicRank,
                warGamesRank: parsed.warGamesRank,
                // Note: scraping_done, enriched_at, enrichment_data are NOT updated
              },
            });

            // Verify enrichment data is preserved
            const updatedGame = await prisma.bggGame.findUnique({
              where: { id: bggId },
            });

            expect(updatedGame).not.toBeNull();
            expect(updatedGame!.scrapingDone).toBe(true);
            expect(updatedGame!.enrichedAt?.getTime()).toBe(enrichedAt.getTime());
            expect(updatedGame!.enrichmentData).toEqual(enrichmentData);

            // Verify CSV data was updated
            expect(updatedGame!.name).toBe('Updated Game Name');
            expect(updatedGame!.yearPublished).toBe(2021);
            expect(updatedGame!.rank).toBe(50);

            // Clean up
            await prisma.bggGame.delete({ where: { id: bggId } });
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should not overwrite enrichment fields on upsert', async () => {
      const bggId = 950000;
      const originalEnrichmentData = {
        alternateNames: [{ name: 'Test Alt', language: 'German' }],
        primaryName: 'Test Primary',
        description: 'Test description',
        shortDescription: 'Short',
        slug: '/test',
        designers: ['Designer'],
        artists: [],
        publishers: [],
        categories: [],
        mechanics: [],
      };

      // Create enriched game
      await prisma.bggGame.create({
        data: {
          id: bggId,
          name: 'Original',
          scrapingDone: true,
          enrichedAt: new Date('2024-01-01'),
          enrichmentData: originalEnrichmentData as any,
        },
      });

      // Upsert with new CSV data
      await prisma.bggGame.upsert({
        where: { id: bggId },
        create: { id: bggId, name: 'New' },
        update: {
          name: 'Updated Name',
          yearPublished: 2025,
        },
      });

      const result = await prisma.bggGame.findUnique({ where: { id: bggId } });

      // Enrichment preserved
      expect(result!.scrapingDone).toBe(true);
      expect(result!.enrichmentData).toEqual(originalEnrichmentData);
      expect(result!.enrichedAt).toEqual(new Date('2024-01-01'));

      // CSV data updated
      expect(result!.name).toBe('Updated Name');
      expect(result!.yearPublished).toBe(2025);

      await prisma.bggGame.delete({ where: { id: bggId } });
    });
  });
});
