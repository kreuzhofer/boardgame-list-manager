/**
 * Property-based tests for BggEnrichmentService idempotency
 * 
 * Feature: 013-bgg-database-enrichment
 * Property 4: Enrichment Idempotency
 * **Validates: Requirements 6.3**
 */

import * as fc from 'fast-check';
import { prisma } from '../../lib/prisma';
import { BggEnrichmentService } from '../bggEnrichmentService';

// Mock fetch to avoid actual API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('BggEnrichmentService Idempotency Property Tests', () => {
  const service = new BggEnrichmentService();

  // Clean up test data after each test
  afterEach(async () => {
    await prisma.bggGame.deleteMany({
      where: {
        id: { gte: 900000 }, // Only delete test IDs
      },
    });
    mockFetch.mockClear();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  /**
   * Property 4: Enrichment Idempotency
   * For any BggGame record with scraping_done=true, calling the enrich endpoint
   * without force=true SHALL NOT make any external API calls and SHALL return
   * the existing enrichment data.
   */
  describe('Property 4: Enrichment Idempotency', () => {
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

    it('should not make API calls for already enriched games', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 900000, max: 999999 }),
          enrichmentDataArbitrary,
          async (bggId, enrichmentData) => {
            // Create an already-enriched game
            await prisma.bggGame.create({
              data: {
                id: bggId,
                name: 'Enriched Game',
                scrapingDone: true,
                enrichedAt: new Date(),
                enrichmentData: enrichmentData as any,
              },
            });

            // Reset mock to track calls
            mockFetch.mockClear();

            // Call enrichGame without force
            const result = await service.enrichGame(bggId, false);

            // Should NOT have made any fetch calls
            expect(mockFetch).not.toHaveBeenCalled();

            // Should return existing enrichment data
            expect(result).toEqual(enrichmentData);

            // Clean up
            await prisma.bggGame.delete({ where: { id: bggId } });
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should return existing enrichment data without modification', async () => {
      const bggId = 950001;
      const originalEnrichmentData = {
        alternateNames: [{ name: 'Alt Name', language: 'German' }],
        primaryName: 'Original Primary',
        description: 'Original description',
        shortDescription: 'Original short',
        slug: '/original',
        designers: ['Original Designer'],
        artists: ['Original Artist'],
        publishers: ['Original Publisher'],
        categories: ['Original Category'],
        mechanics: ['Original Mechanic'],
      };

      await prisma.bggGame.create({
        data: {
          id: bggId,
          name: 'Test Game',
          scrapingDone: true,
          enrichedAt: new Date('2024-06-01'),
          enrichmentData: originalEnrichmentData as any,
        },
      });

      const result = await service.enrichGame(bggId, false);

      // Should return exact same data
      expect(result).toEqual(originalEnrichmentData);

      // Database should be unchanged
      const dbGame = await prisma.bggGame.findUnique({ where: { id: bggId } });
      expect(dbGame!.enrichmentData).toEqual(originalEnrichmentData);
      expect(dbGame!.enrichedAt).toEqual(new Date('2024-06-01'));

      await prisma.bggGame.delete({ where: { id: bggId } });
    });

    it('should make API call when force=true even if already enriched', async () => {
      const bggId = 950002;
      const originalEnrichmentData = {
        alternateNames: [],
        primaryName: 'Original',
        description: '',
        shortDescription: '',
        slug: '',
        designers: [],
        artists: [],
        publishers: [],
        categories: [],
        mechanics: [],
      };

      await prisma.bggGame.create({
        data: {
          id: bggId,
          name: 'Test Game',
          scrapingDone: true,
          enrichedAt: new Date('2024-01-01'),
          enrichmentData: originalEnrichmentData as any,
        },
      });

      // Mock fetch to return new data
      const newHtml = `
        <html><script>
        GEEK.geekitemPreload = {
          "item": {
            "name": "New Name",
            "description": "New description",
            "links": {}
          }
        };
        GEEK.geekitemSettings = {};
        </script></html>
      `;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(newHtml),
      });

      // Call with force=true
      const result = await service.enrichGame(bggId, true);

      // Should have made fetch call
      expect(mockFetch).toHaveBeenCalled();

      // Should return new data
      expect(result.primaryName).toBe('New Name');
      expect(result.description).toBe('New description');

      await prisma.bggGame.delete({ where: { id: bggId } });
    });
  });
});
