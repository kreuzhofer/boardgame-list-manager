/**
 * Property-based tests for BggEnrichmentService
 * 
 * Feature: 013-bgg-database-enrichment
 * Property 5: Missing Fields Robustness
 * Property 6: Malformed JSON Error Handling
 * Property 7: HTML Sanitization
 * **Validates: Requirements 7.1, 7.4, 7.5**
 */

import * as fc from 'fast-check';
import { BggEnrichmentService } from '../bggEnrichmentService';

describe('BggEnrichmentService Property Tests', () => {
  const service = new BggEnrichmentService();

  /**
   * Helper to create valid GEEK.geekitemPreload HTML
   */
  const createValidHtml = (item: any): string => {
    const json = JSON.stringify({ item });
    return `<html><script>GEEK.geekitemPreload = ${json};\nGEEK.geekitemSettings = {};</script></html>`;
  };

  /**
   * Property 5: Missing Fields Robustness
   * For any GEEK.geekitemPreload JSON object with missing optional fields,
   * the extraction function SHALL return an EnrichmentData object with
   * empty arrays/null values for missing fields without throwing errors.
   */
  describe('Property 5: Missing Fields Robustness', () => {
    // Arbitrary for item with random missing fields
    const partialItemArbitrary = fc.record({
      name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
      description: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
      short_description: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: undefined }),
      href: fc.option(fc.string({ minLength: 0, maxLength: 50 }), { nil: undefined }),
      alternatenames: fc.option(
        fc.array(fc.record({ name: fc.string() }), { maxLength: 3 }),
        { nil: undefined }
      ),
      links: fc.option(
        fc.record({
          boardgamedesigner: fc.option(fc.array(fc.record({ name: fc.string() }), { maxLength: 2 }), { nil: undefined }),
          boardgameartist: fc.option(fc.array(fc.record({ name: fc.string() }), { maxLength: 2 }), { nil: undefined }),
          boardgamepublisher: fc.option(fc.array(fc.record({ name: fc.string() }), { maxLength: 2 }), { nil: undefined }),
          boardgamecategory: fc.option(fc.array(fc.record({ name: fc.string() }), { maxLength: 2 }), { nil: undefined }),
          boardgamemechanic: fc.option(fc.array(fc.record({ name: fc.string() }), { maxLength: 2 }), { nil: undefined }),
        }),
        { nil: undefined }
      ),
    });

    it('should handle missing optional fields without throwing', () => {
      fc.assert(
        fc.property(partialItemArbitrary, (item) => {
          const html = createValidHtml(item);
          
          // Should not throw
          const result = service.extractEnrichmentData(html);
          
          // Verify structure
          expect(result).toHaveProperty('alternateNames');
          expect(result).toHaveProperty('primaryName');
          expect(result).toHaveProperty('description');
          expect(result).toHaveProperty('shortDescription');
          expect(result).toHaveProperty('slug');
          expect(result).toHaveProperty('designers');
          expect(result).toHaveProperty('artists');
          expect(result).toHaveProperty('publishers');
          expect(result).toHaveProperty('categories');
          expect(result).toHaveProperty('mechanics');
          
          // Verify types
          expect(Array.isArray(result.alternateNames)).toBe(true);
          expect(typeof result.primaryName).toBe('string');
          expect(typeof result.description).toBe('string');
          expect(typeof result.shortDescription).toBe('string');
          expect(typeof result.slug).toBe('string');
          expect(Array.isArray(result.designers)).toBe(true);
          expect(Array.isArray(result.artists)).toBe(true);
          expect(Array.isArray(result.publishers)).toBe(true);
          expect(Array.isArray(result.categories)).toBe(true);
          expect(Array.isArray(result.mechanics)).toBe(true);
        }),
        { numRuns: 20 }
      );
    });

    it('should return empty arrays for missing link types', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('boardgamedesigner', 'boardgameartist', 'boardgamepublisher', 'boardgamecategory', 'boardgamemechanic'),
          (missingLinkType) => {
            const item = {
              name: 'Test Game',
              links: {
                // Only include some link types
                boardgamedesigner: missingLinkType === 'boardgamedesigner' ? undefined : [{ name: 'Designer' }],
              },
            };
            const html = createValidHtml(item);
            const result = service.extractEnrichmentData(html);
            
            // The missing link type should result in empty array
            const fieldMap: Record<string, keyof typeof result> = {
              boardgamedesigner: 'designers',
              boardgameartist: 'artists',
              boardgamepublisher: 'publishers',
              boardgamecategory: 'categories',
              boardgamemechanic: 'mechanics',
            };
            
            const field = fieldMap[missingLinkType];
            if (missingLinkType === 'boardgamedesigner') {
              expect(result[field]).toEqual([]);
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });


  /**
   * Property 6: Malformed JSON Error Handling
   * For any HTML string that does not contain a valid GEEK.geekitemPreload JSON object,
   * the extraction function SHALL throw a descriptive error.
   */
  describe('Property 6: Malformed JSON Error Handling', () => {
    it('should throw error for HTML without GEEK.geekitemPreload', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 500 }),
          (randomHtml) => {
            // Ensure the random string doesn't accidentally contain valid pattern
            const html = randomHtml.replace(/GEEK\.geekitemPreload/g, 'INVALID');
            
            expect(() => service.extractEnrichmentData(html)).toThrow();
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should throw error for invalid JSON in GEEK.geekitemPreload', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (invalidJson) => {
            // Create HTML with invalid JSON
            const html = `<html><script>GEEK.geekitemPreload = {invalid: ${invalidJson}};\nGEEK.geekitemSettings = {};</script></html>`;
            
            // Should throw due to invalid JSON
            expect(() => service.extractEnrichmentData(html)).toThrow();
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should throw error when item is missing from JSON', () => {
      const html = `<html><script>GEEK.geekitemPreload = {"notItem": {}};\nGEEK.geekitemSettings = {};</script></html>`;
      expect(() => service.extractEnrichmentData(html)).toThrow('No item found');
    });
  });

  /**
   * Property 7: HTML Sanitization
   * For any description field containing potentially dangerous HTML,
   * the sanitization function SHALL remove or neutralize these elements.
   */
  describe('Property 7: HTML Sanitization', () => {
    // Arbitrary for dangerous HTML patterns
    const dangerousHtmlArbitrary = fc.oneof(
      fc.constant('<script>alert("xss")</script>'),
      fc.constant('<script src="evil.js"></script>'),
      fc.constant('<img onerror="alert(1)" src="x">'),
      fc.constant('<div onclick="evil()">click</div>'),
      fc.constant('<iframe src="evil.com"></iframe>'),
      fc.constant('<a onmouseover="steal()">link</a>'),
      fc.tuple(fc.string({ minLength: 1, maxLength: 20 })).map(([s]) => `<script>${s}</script>`),
    );

    it('should remove script tags from description', () => {
      fc.assert(
        fc.property(dangerousHtmlArbitrary, (dangerousHtml) => {
          const item = {
            name: 'Test Game',
            description: `Safe text ${dangerousHtml} more safe text`,
          };
          const html = createValidHtml(item);
          const result = service.extractEnrichmentData(html);
          
          // Should not contain script tags
          expect(result.description).not.toMatch(/<script/i);
          expect(result.description).not.toMatch(/<\/script>/i);
        }),
        { numRuns: 10 }
      );
    });

    it('should remove event handlers from description', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('onclick', 'onerror', 'onmouseover', 'onload', 'onfocus'),
          (eventHandler) => {
            const item = {
              name: 'Test Game',
              description: `<div ${eventHandler}="evil()">content</div>`,
            };
            const html = createValidHtml(item);
            const result = service.extractEnrichmentData(html);
            
            // Should not contain event handlers
            expect(result.description).not.toMatch(new RegExp(eventHandler, 'i'));
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should remove iframe tags from description', () => {
      const item = {
        name: 'Test Game',
        description: 'Text <iframe src="evil.com"></iframe> more text',
      };
      const html = createValidHtml(item);
      const result = service.extractEnrichmentData(html);
      
      expect(result.description).not.toMatch(/<iframe/i);
    });

    it('should preserve safe HTML formatting', () => {
      const item = {
        name: 'Test Game',
        description: '<p>Paragraph</p><b>Bold</b><i>Italic</i><br/>',
      };
      const html = createValidHtml(item);
      const result = service.extractEnrichmentData(html);
      
      // Safe tags should be preserved
      expect(result.description).toContain('<p>');
      expect(result.description).toContain('<b>');
      expect(result.description).toContain('<i>');
    });
  });

  /**
   * Test formatBytes helper
   */
  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(service.formatBytes(500)).toBe('500 B');
      expect(service.formatBytes(1024)).toBe('1.0 KB');
      expect(service.formatBytes(1536)).toBe('1.5 KB');
      expect(service.formatBytes(1048576)).toBe('1.0 MB');
      expect(service.formatBytes(1073741824)).toBe('1.00 GB');
    });
  });
});
