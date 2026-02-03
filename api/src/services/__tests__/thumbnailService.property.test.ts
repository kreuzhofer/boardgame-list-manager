/**
 * Property-based tests for ThumbnailService
 * 
 * Feature: 023-custom-thumbnail-upload
 * 
 * These tests verify correctness properties for the thumbnail service's
 * storage, retrieval, and deletion behavior.
 * 
 * **Validates: Requirements 1.1, 1.4, 1.5, 2.1, 2.2, 3.1**
 */

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import sharp from 'sharp';
import { ThumbnailService } from '../thumbnailService';

/**
 * Arbitrary for valid game IDs (UUIDs)
 */
const gameIdArbitrary = fc.uuid();

/**
 * Arbitrary for image sizes
 */
const imageSizeArbitrary = fc.constantFrom('micro' as const, 'square200' as const);

/**
 * Create a test instance of ThumbnailService with a temp cache directory
 */
function createTestService(cacheDir: string): ThumbnailService {
  return new ThumbnailService(cacheDir);
}

/**
 * Generate a valid test image buffer (small PNG)
 */
async function createTestImageBuffer(width: number = 100, height: number = 100): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .png()
    .toBuffer();
}

describe('ThumbnailService Property Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create a unique temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'thumbnail-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  /**
   * Feature: 023-custom-thumbnail-upload, Property 1: Upload and Storage Correctness
   * 
   * For any valid image file uploaded for a custom game, the service shall store 
   * both micro (64x64) and square200 (200x200) JPEG files in the custom thumbnails 
   * directory with filenames matching the pattern {gameId}-{size}.jpg.
   * 
   * **Validates: Requirements 1.1, 1.4, 1.5, 2.1, 2.2**
   */
  describe('Feature: 023-custom-thumbnail-upload, Property 1: Upload and Storage Correctness', () => {
    it('should store both micro and square200 JPEG files with correct naming', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameIdArbitrary,
          async (gameId) => {
            const service = createTestService(tempDir);
            const imageBuffer = await createTestImageBuffer();

            // Store the thumbnail
            await service.storeThumbnail(gameId, imageBuffer);

            // Verify both files exist with correct naming
            const microPath = path.join(tempDir, `${gameId}-micro.jpg`);
            const square200Path = path.join(tempDir, `${gameId}-square200.jpg`);

            const microExists = fs.existsSync(microPath);
            const square200Exists = fs.existsSync(square200Path);

            return microExists && square200Exists;
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should convert images to JPEG format', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameIdArbitrary,
          async (gameId) => {
            const service = createTestService(tempDir);
            const imageBuffer = await createTestImageBuffer(); // PNG input

            await service.storeThumbnail(gameId, imageBuffer);

            // Read the stored files and verify they are JPEG
            const microPath = path.join(tempDir, `${gameId}-micro.jpg`);
            const square200Path = path.join(tempDir, `${gameId}-square200.jpg`);

            const microBuffer = fs.readFileSync(microPath);
            const square200Buffer = fs.readFileSync(square200Path);

            // JPEG files start with 0xFF 0xD8
            const microIsJpeg = microBuffer[0] === 0xFF && microBuffer[1] === 0xD8;
            const square200IsJpeg = square200Buffer[0] === 0xFF && square200Buffer[1] === 0xD8;

            return microIsJpeg && square200IsJpeg;
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should resize images to correct dimensions', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameIdArbitrary,
          async (gameId) => {
            const service = createTestService(tempDir);
            const imageBuffer = await createTestImageBuffer(500, 500); // Large input

            await service.storeThumbnail(gameId, imageBuffer);

            // Check dimensions of stored files
            const microPath = path.join(tempDir, `${gameId}-micro.jpg`);
            const square200Path = path.join(tempDir, `${gameId}-square200.jpg`);

            const microMetadata = await sharp(microPath).metadata();
            const square200Metadata = await sharp(square200Path).metadata();

            const microCorrect = microMetadata.width === 64 && microMetadata.height === 64;
            const square200Correct = square200Metadata.width === 200 && square200Metadata.height === 200;

            return microCorrect && square200Correct;
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  /**
   * Feature: 023-custom-thumbnail-upload, Property 5: Retrieval Correctness
   * 
   * For any game with custom thumbnails, requesting a thumbnail with a specific 
   * size (micro or square200) shall return the corresponding file from the 
   * custom thumbnails directory.
   * 
   * **Validates: Requirements 2.3, 2.4**
   */
  describe('Feature: 023-custom-thumbnail-upload, Property 5: Retrieval Correctness', () => {
    it('should return correct path for stored thumbnails', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameIdArbitrary,
          imageSizeArbitrary,
          async (gameId, size) => {
            const service = createTestService(tempDir);
            const imageBuffer = await createTestImageBuffer();

            // Store the thumbnail
            await service.storeThumbnail(gameId, imageBuffer);

            // Retrieve the path
            const retrievedPath = service.getThumbnailPath(gameId, size);
            const expectedPath = path.join(tempDir, `${gameId}-${size}.jpg`);

            return retrievedPath === expectedPath;
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should return null for non-existent thumbnails', () => {
      fc.assert(
        fc.property(
          gameIdArbitrary,
          imageSizeArbitrary,
          (gameId, size) => {
            const service = createTestService(tempDir);

            // Don't store anything - should return null
            const result = service.getThumbnailPath(gameId, size);

            return result === null;
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  /**
   * Feature: 023-custom-thumbnail-upload, Property 6: Cleanup on Deletion
   * 
   * For any custom game with custom thumbnails that is deleted, both the micro 
   * and square200 thumbnail files shall be removed from the file system.
   * 
   * **Validates: Requirements 3.1, 3.3**
   */
  describe('Feature: 023-custom-thumbnail-upload, Property 6: Cleanup on Deletion', () => {
    it('should delete both thumbnail files when deleteThumbnails is called', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameIdArbitrary,
          async (gameId) => {
            const service = createTestService(tempDir);
            const imageBuffer = await createTestImageBuffer();

            // Store the thumbnail
            await service.storeThumbnail(gameId, imageBuffer);

            // Verify files exist
            const microPath = path.join(tempDir, `${gameId}-micro.jpg`);
            const square200Path = path.join(tempDir, `${gameId}-square200.jpg`);
            const existsBefore = fs.existsSync(microPath) && fs.existsSync(square200Path);

            // Delete thumbnails
            await service.deleteThumbnails(gameId);

            // Verify files are deleted
            const existsAfter = fs.existsSync(microPath) || fs.existsSync(square200Path);

            return existsBefore && !existsAfter;
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should not throw when deleting non-existent thumbnails', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameIdArbitrary,
          async (gameId) => {
            const service = createTestService(tempDir);

            // Should not throw
            try {
              await service.deleteThumbnails(gameId);
              return true;
            } catch {
              return false;
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  /**
   * Feature: 023-custom-thumbnail-upload, Property 8: Thumbnail Replacement
   * 
   * For any game that already has custom thumbnails, uploading a new thumbnail 
   * shall replace the existing files (not create duplicates).
   * 
   * **Validates: Requirements 5.5**
   */
  describe('Feature: 023-custom-thumbnail-upload, Property 8: Thumbnail Replacement', () => {
    it('should replace existing thumbnails when uploading new ones', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameIdArbitrary,
          async (gameId) => {
            const service = createTestService(tempDir);

            // Create first image (red)
            const firstImage = await sharp({
              create: {
                width: 100,
                height: 100,
                channels: 3,
                background: { r: 255, g: 0, b: 0 },
              },
            }).png().toBuffer();

            // Create second image (blue)
            const secondImage = await sharp({
              create: {
                width: 100,
                height: 100,
                channels: 3,
                background: { r: 0, g: 0, b: 255 },
              },
            }).png().toBuffer();

            // Store first thumbnail
            await service.storeThumbnail(gameId, firstImage);
            const microPath = path.join(tempDir, `${gameId}-micro.jpg`);
            const firstContent = fs.readFileSync(microPath);

            // Store second thumbnail (should replace)
            await service.storeThumbnail(gameId, secondImage);
            const secondContent = fs.readFileSync(microPath);

            // Content should be different (replaced, not duplicated)
            const contentChanged = !firstContent.equals(secondContent);

            // Should still only have 2 files (micro and square200)
            const files = fs.readdirSync(tempDir).filter(f => f.startsWith(gameId));
            const onlyTwoFiles = files.length === 2;

            return contentChanged && onlyTwoFiles;
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  /**
   * hasThumbnail method tests
   */
  describe('hasThumbnail', () => {
    it('should return true only when both sizes exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          gameIdArbitrary,
          async (gameId) => {
            const service = createTestService(tempDir);

            // Initially no thumbnails
            const beforeStore = !service.hasThumbnail(gameId);

            // Store thumbnails
            const imageBuffer = await createTestImageBuffer();
            await service.storeThumbnail(gameId, imageBuffer);

            // Now should have thumbnails
            const afterStore = service.hasThumbnail(gameId);

            return beforeStore && afterStore;
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});
