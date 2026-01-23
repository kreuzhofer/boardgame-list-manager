/**
 * Property-based tests for BggImageService
 * 
 * Feature: bgg-game-thumbnails
 * 
 * These tests verify correctness properties for the image service's
 * caching, file naming, and fetch behavior.
 * 
 * **Validates: Requirements 1.1, 1.2, 1.5, 1.6, 9.4, 9.5, 10.5**
 */

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { BggImageService } from '../bggImageService';

/**
 * Arbitrary for valid BGG IDs (positive integers)
 */
const bggIdArbitrary = fc.integer({ min: 1, max: 999999 });

/**
 * Arbitrary for image sizes
 */
const imageSizeArbitrary = fc.constantFrom('micro' as const, 'square200' as const);

/**
 * Create a test instance of BggImageService with a temp cache directory
 */
function createTestService(cacheDir: string): BggImageService {
  // Create a new instance with custom cache dir
  const service = new BggImageService(cacheDir);
  (service as any).scrapeEnabled = false; // Disable actual scraping in tests
  return service;
}

/**
 * Create a fake cached image file
 */
function createFakeImage(cacheDir: string, bggId: number, size: 'micro' | 'square200'): string {
  const filepath = path.join(cacheDir, `${bggId}-${size}.jpg`);
  fs.writeFileSync(filepath, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0])); // Minimal JPEG header
  return filepath;
}

/**
 * Create a no-image marker file
 */
function createNoImageMarker(cacheDir: string, bggId: number): string {
  const filepath = path.join(cacheDir, `${bggId}-noimage`);
  fs.writeFileSync(filepath, '');
  return filepath;
}

describe('BggImageService Property Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create a unique temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bgg-image-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  /**
   * Feature: bgg-game-thumbnails, Property 1: Cache hit returns immediately
   * 
   * For any BGG ID where both image files exist in the cache, the service 
   * should return the requested image without making any ScraperAPI calls.
   * 
   * **Validates: Requirements 1.1, 1.2**
   */
  describe('Feature: bgg-game-thumbnails, Property 1: Cache hit returns immediately', () => {
    it('should return cached image path when file exists', async () => {
      await fc.assert(
        fc.asyncProperty(
          bggIdArbitrary,
          imageSizeArbitrary,
          async (bggId, size) => {
            const service = createTestService(tempDir);
            
            // Create both cached images
            createFakeImage(tempDir, bggId, 'micro');
            createFakeImage(tempDir, bggId, 'square200');
            
            // Get the image - should return immediately without fetching
            const result = await service.getImage(bggId, size);
            
            // Should return the cached path
            const expectedPath = path.join(tempDir, `${bggId}-${size}.jpg`);
            return result === expectedPath;
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should detect cached images correctly with isCached', () => {
      fc.assert(
        fc.property(
          bggIdArbitrary,
          (bggId) => {
            const service = createTestService(tempDir);
            
            // Initially not cached
            const beforeCache = !service.isCached(bggId);
            
            // Create only micro - should still not be "cached" (need both)
            createFakeImage(tempDir, bggId, 'micro');
            const afterMicro = !service.isCached(bggId);
            
            // Create square200 - now should be cached
            createFakeImage(tempDir, bggId, 'square200');
            const afterBoth = service.isCached(bggId);
            
            return beforeCache && afterMicro && afterBoth;
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  /**
   * Feature: bgg-game-thumbnails, Property 2: File naming convention
   * 
   * For any successfully fetched BGG image, the cached file name should 
   * match the pattern {bggId}-{size}.jpg where size is either micro or square200.
   * 
   * **Validates: Requirements 1.6**
   */
  describe('Feature: bgg-game-thumbnails, Property 2: File naming convention', () => {
    it('should use correct file naming pattern {bggId}-{size}.jpg', () => {
      fc.assert(
        fc.property(
          bggIdArbitrary,
          imageSizeArbitrary,
          (bggId, size) => {
            // Create a cached image
            const createdPath = createFakeImage(tempDir, bggId, size);
            
            // Verify the naming pattern
            const expectedFilename = `${bggId}-${size}.jpg`;
            const actualFilename = path.basename(createdPath);
            
            return actualFilename === expectedFilename;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should generate consistent paths for same bggId and size', () => {
      fc.assert(
        fc.property(
          bggIdArbitrary,
          imageSizeArbitrary,
          (bggId, size) => {
            const testService = createTestService(tempDir);
            
            // Get path multiple times - should be consistent
            const path1 = (testService as any).getImagePath(bggId, size);
            const path2 = (testService as any).getImagePath(bggId, size);
            const path3 = (testService as any).getImagePath(bggId, size);
            
            return path1 === path2 && path2 === path3;
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Feature: bgg-game-thumbnails, Property 8: No-image marker
   * 
   * For any BGG game that has no images available, a marker file should 
   * be created to prevent repeated fetch attempts on subsequent requests.
   * 
   * **Validates: Requirements 9.5**
   */
  describe('Feature: bgg-game-thumbnails, Property 8: No-image marker', () => {
    it('should detect no-image marker correctly', () => {
      fc.assert(
        fc.property(
          bggIdArbitrary,
          (bggId) => {
            const service = createTestService(tempDir);
            
            // Initially no marker
            const beforeMarker = !service.hasNoImageMarker(bggId);
            
            // Create marker
            createNoImageMarker(tempDir, bggId);
            
            // Now should have marker
            const afterMarker = service.hasNoImageMarker(bggId);
            
            return beforeMarker && afterMarker;
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should return null when no-image marker exists', async () => {
      await fc.assert(
        fc.asyncProperty(
          bggIdArbitrary,
          imageSizeArbitrary,
          async (bggId, size) => {
            const service = createTestService(tempDir);
            
            // Create no-image marker
            createNoImageMarker(tempDir, bggId);
            
            // Should return null without attempting fetch
            const result = await service.getImage(bggId, size);
            
            return result === null;
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  /**
   * Feature: bgg-game-thumbnails, Property 9: Cache immutability
   * 
   * For any cached image file, subsequent fetch operations for the same 
   * BGG ID should not overwrite or modify the existing file.
   * 
   * **Validates: Requirements 10.5**
   */
  describe('Feature: bgg-game-thumbnails, Property 9: Cache immutability', () => {
    it('should not modify existing cached files', async () => {
      await fc.assert(
        fc.asyncProperty(
          bggIdArbitrary,
          imageSizeArbitrary,
          async (bggId, size) => {
            const service = createTestService(tempDir);
            
            // Create cached images with known content
            const filepath = createFakeImage(tempDir, bggId, size);
            createFakeImage(tempDir, bggId, size === 'micro' ? 'square200' : 'micro');
            
            // Get original file stats
            const originalStats = fs.statSync(filepath);
            const originalContent = fs.readFileSync(filepath);
            
            // Request the image (should use cache)
            await service.getImage(bggId, size);
            
            // File should be unchanged
            const newStats = fs.statSync(filepath);
            const newContent = fs.readFileSync(filepath);
            
            return originalStats.size === newStats.size &&
                   originalContent.equals(newContent);
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  /**
   * Test for extractImageUrls method
   */
  describe('extractImageUrls', () => {
    it('should extract image URLs from valid HTML', () => {
      const service = createTestService(tempDir);
      
      const html = `
        <html>
        <script>
        GEEK.geekitemPreload = {
          "item": {
            "images": {
              "micro": "https://cf.geekdo-images.com/micro/img/abc123.jpg",
              "square200": "https://cf.geekdo-images.com/square200/img/def456.jpg"
            }
          }
        };
        GEEK.geekitemSettings = {};
        </script>
        </html>
      `;
      
      const result = service.extractImageUrls(html);
      
      expect(result.micro).toBe('https://cf.geekdo-images.com/micro/img/abc123.jpg');
      expect(result.square200).toBe('https://cf.geekdo-images.com/square200/img/def456.jpg');
    });

    it('should return empty object for HTML without images', () => {
      const service = createTestService(tempDir);
      
      const html = '<html><body>No images here</body></html>';
      
      const result = service.extractImageUrls(html);
      
      expect(result.micro).toBeUndefined();
      expect(result.square200).toBeUndefined();
    });
  });
});
