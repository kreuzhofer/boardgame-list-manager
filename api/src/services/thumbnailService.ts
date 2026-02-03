/**
 * ThumbnailService - Service for storing and serving custom game thumbnails
 * 
 * Requirements: 1.1, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1
 * 
 * This service handles custom thumbnail uploads for non-BGG games,
 * generating both micro (64x64) and square200 (200x200) sizes,
 * and converting all images to JPEG for consistency with BGG thumbnails.
 */

import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { config } from '../config';

export type ImageSize = 'micro' | 'square200';

const SIZE_DIMENSIONS: Record<ImageSize, { width: number; height: number }> = {
  micro: { width: 64, height: 64 },
  square200: { width: 200, height: 200 },
};

/**
 * ThumbnailService class
 * 
 * Manages storing, retrieving, and deleting custom game thumbnails.
 */
class ThumbnailService {
  private cacheDir: string;
  private initialized: boolean = false;

  constructor(customCacheDir?: string) {
    this.cacheDir = customCacheDir || config.customThumbnails.cacheDir;
  }

  /**
   * Initialize the service (create cache directory)
   * Called lazily on first use to avoid issues during import
   */
  private ensureInitialized(): void {
    if (this.initialized) return;
    this.ensureCacheDir();
    this.initialized = true;
  }

  /**
   * Ensure the cache directory exists
   */
  private ensureCacheDir(): void {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
    } catch (error) {
      console.warn(`[ThumbnailService] Could not create cache directory: ${this.cacheDir}`, error);
    }
  }

  /**
   * Get the file path for a thumbnail
   * Requirement 2.2: Files named using pattern {gameId}-{size}.jpg
   */
  private getImagePath(gameId: string, size: ImageSize): string {
    return path.join(this.cacheDir, `${gameId}-${size}.jpg`);
  }

  /**
   * Store a thumbnail for a game, generating both sizes
   * 
   * Requirement 1.1: Accept and store uploaded image
   * Requirement 1.4: Generate both micro (64x64) and square200 (200x200) thumbnails
   * Requirement 1.5: Convert to JPEG format
   * Requirement 2.1: Store in dedicated directory
   * Requirement 2.2: Name files using pattern {gameId}-{size}.jpg
   * 
   * @param gameId - The game ID to associate the thumbnail with
   * @param imageBuffer - The uploaded image data
   */
  async storeThumbnail(gameId: string, imageBuffer: Buffer): Promise<void> {
    this.ensureInitialized();

    // Generate both sizes
    for (const size of ['micro', 'square200'] as ImageSize[]) {
      const dimensions = SIZE_DIMENSIONS[size];
      const outputPath = this.getImagePath(gameId, size);

      const jpegBuffer = await sharp(imageBuffer)
        .resize(dimensions.width, dimensions.height, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      fs.writeFileSync(outputPath, jpegBuffer);
    }
  }

  /**
   * Get path to a thumbnail file, or null if not exists
   * 
   * Requirement 2.3: Check for custom thumbnails
   * Requirement 2.4: Return appropriate size based on request
   * 
   * @param gameId - The game ID
   * @param size - Image size: 'micro' or 'square200'
   * @returns Path to the thumbnail file, or null if not exists
   */
  getThumbnailPath(gameId: string, size: ImageSize): string | null {
    this.ensureInitialized();
    const imagePath = this.getImagePath(gameId, size);
    
    if (fs.existsSync(imagePath)) {
      return imagePath;
    }
    
    return null;
  }

  /**
   * Delete thumbnails for a game
   * 
   * Requirement 3.1: Delete both micro and square200 thumbnail files
   * 
   * @param gameId - The game ID
   */
  async deleteThumbnails(gameId: string): Promise<void> {
    this.ensureInitialized();

    for (const size of ['micro', 'square200'] as ImageSize[]) {
      const imagePath = this.getImagePath(gameId, size);
      
      try {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (error) {
        // Log but don't throw - allow game deletion to proceed
        console.error(`[ThumbnailService] Failed to delete thumbnail ${imagePath}:`, error);
      }
    }
  }

  /**
   * Check if a game has custom thumbnails
   * 
   * @param gameId - The game ID
   * @returns true if both thumbnail sizes exist
   */
  hasThumbnail(gameId: string): boolean {
    this.ensureInitialized();
    const microPath = this.getImagePath(gameId, 'micro');
    const square200Path = this.getImagePath(gameId, 'square200');
    return fs.existsSync(microPath) && fs.existsSync(square200Path);
  }

  /**
   * Get the cache directory path (for testing)
   */
  getCacheDir(): string {
    return this.cacheDir;
  }
}

// Export singleton instance
export const thumbnailService = new ThumbnailService();
export { ThumbnailService };
