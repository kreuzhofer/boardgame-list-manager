/**
 * BggImageService - Service for fetching and caching BGG game thumbnails
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 9.3, 9.4, 9.5
 * 
 * This service fetches images from BGG pages using configured fetch providers, stores them
 * locally in a persistent file cache, and serves them through a dedicated
 * API endpoint. All images are converted to JPEG for maximum compatibility.
 */

import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { config } from '../config';
import { createBggFetchQueue, BggFetchQueue } from './bggFetchQueue';
import bggPageFetcher from './bggPageFetcher';

export type ImageSize = 'micro' | 'square200';

/**
 * Interface for the image URLs extracted from BGG page
 */
interface BggImageUrls {
  micro?: string;
  square200?: string;
}

/**
 * BggImageService class
 * 
 * Manages fetching, caching, and serving BGG game thumbnails.
 */
class BggImageService {
  private cacheDir: string;
  private fetchQueue: BggFetchQueue;
  private scrapeEnabled: boolean;
  private initialized: boolean = false;

  constructor(customCacheDir?: string) {
    this.cacheDir = customCacheDir || config.bggImages.cacheDir;
    this.scrapeEnabled = config.bggImages.scrapeEnabled;
    
    // Create the fetch queue with our fetch function
    this.fetchQueue = createBggFetchQueue(this.fetchAndCacheImages.bind(this));
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
      // Log but don't throw - directory might be created later
      console.warn(`[BggImageService] Could not create cache directory: ${this.cacheDir}`, error);
    }
  }

  /**
   * Get the file path for a cached image
   * Requirement 1.6: Files named using pattern {bggId}-{size}.jpg
   */
  private getImagePath(bggId: number, size: ImageSize): string {
    return path.join(this.cacheDir, `${bggId}-${size}.jpg`);
  }

  /**
   * Get the path for the no-image marker file
   * Requirement 9.5: Marker file for games without images
   */
  private getNoImageMarkerPath(bggId: number): string {
    return path.join(this.cacheDir, `${bggId}-noimage`);
  }

  /**
   * Get the content type for cached images (always JPEG)
   */
  getContentType(_bggId: number): string {
    return 'image/jpeg';
  }

  /**
   * Check if images are cached for a BGG game
   * Requirement 1.1: Check if image file exists in cache directory
   */
  isCached(bggId: number): boolean {
    this.ensureInitialized();
    const microPath = this.getImagePath(bggId, 'micro');
    const square200Path = this.getImagePath(bggId, 'square200');
    return fs.existsSync(microPath) && fs.existsSync(square200Path);
  }

  /**
   * Check if a no-image marker exists for a BGG game
   * Requirement 9.5: Check marker file to avoid repeated fetch attempts
   */
  hasNoImageMarker(bggId: number): boolean {
    this.ensureInitialized();
    return fs.existsSync(this.getNoImageMarkerPath(bggId));
  }

  /**
   * Get image for a BGG game. Returns cached image or fetches from BGG.
   * 
   * Requirement 1.1: Check if image file exists in cache directory
   * Requirement 1.2: Return cached image immediately if exists
   * Requirement 1.3: Enqueue fetch request if not cached
   * 
   * @param bggId - BoardGameGeek game ID
   * @param size - Image size: 'micro' (64x64) or 'square200' (200x200)
   * @returns Path to cached image file, or null if unavailable
   */
  async getImage(bggId: number, size: ImageSize): Promise<string | null> {
    this.ensureInitialized();
    const imagePath = this.getImagePath(bggId, size);
    
    // Requirement 1.2: Return cached image immediately if exists
    if (fs.existsSync(imagePath)) {
      return imagePath;
    }
    
    // Requirement 9.5: Check no-image marker
    if (this.hasNoImageMarker(bggId)) {
      return null;
    }
    
    // Check if scraping is enabled
    if (!this.scrapeEnabled) {
      return null;
    }
    
    // Requirement 1.3: Enqueue fetch request
    try {
      await this.fetchQueue.enqueue(bggId);
      
      // After fetch, check if image now exists
      if (fs.existsSync(imagePath)) {
        return imagePath;
      }
      
      return null;
    } catch (error) {
      // Requirement 9.3: Log error for monitoring
      console.error(`[BggImageService] Failed to fetch image for BGG ID ${bggId}:`, error);
      // Requirement 9.4: Allow retry on next request (don't cache failure)
      return null;
    }
  }

  /**
   * Fetch and cache images for a BGG game
   * This is the function passed to the fetch queue
   * 
   * Requirement 1.4: Extract image URLs from GEEK.geekitemPreload JSON
   * Requirement 1.5: Download BOTH micro and square200 images
   */
  private async fetchAndCacheImages(bggId: number): Promise<void> {
    // Fetch the BGG page HTML
    const html = await this.fetchBggPage(bggId);
    
    // Requirement 1.4: Extract image URLs from embedded JSON
    const imageUrls = this.extractImageUrls(html);
    
    if (!imageUrls.micro && !imageUrls.square200) {
      // Requirement 9.5: Create marker file for games without images
      this.createNoImageMarker(bggId);
      throw new Error(`No images found for BGG ID ${bggId}`);
    }
    
    // Requirement 1.5: Download BOTH sizes (converted to JPEG)
    if (imageUrls.micro) {
      await this.downloadImage(imageUrls.micro, this.getImagePath(bggId, 'micro'));
    }
    
    if (imageUrls.square200) {
      await this.downloadImage(imageUrls.square200, this.getImagePath(bggId, 'square200'));
    }
  }

  /**
   * Fetch BGG page HTML using configured fetch providers
   */
  private async fetchBggPage(bggId: number): Promise<string> {
    const result = await bggPageFetcher.fetchBggPage(bggId);
    return result.html;
  }

  /**
   * Extract image URLs from BGG page HTML
   * Requirement 1.4: Extract from GEEK.geekitemPreload JSON object
   */
  extractImageUrls(html: string): BggImageUrls {
    const result: BggImageUrls = {};
    
    // Extract from GEEK.geekitemPreload JSON (method from bgg-image-test.js)
    const geekitemMatch = html.match(/GEEK\.geekitemPreload\s*=\s*(\{[\s\S]*?\});[\s\n]*GEEK\.geekitemSettings/);
    
    if (geekitemMatch) {
      try {
        const geekitem = JSON.parse(geekitemMatch[1]);
        if (geekitem.item?.images) {
          result.micro = geekitem.item.images.micro;
          result.square200 = geekitem.item.images.square200;
        }
      } catch (e) {
        console.error('[BggImageService] Failed to parse geekitem JSON:', e);
      }
    }
    
    return result;
  }

  /**
   * Download an image from URL, convert to JPEG, and save to file
   * 
   * Note: We fetch images directly from BGG CDN without ScraperAPI
   * since image CDNs don't need JavaScript rendering.
   * All images are converted to JPEG for maximum browser compatibility
   * (older iOS Safari doesn't support WebP).
   */
  private async downloadImage(url: string, filepath: string): Promise<void> {
    // Fetch directly from BGG CDN
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    
    // Convert to JPEG using sharp for maximum compatibility
    const jpegBuffer = await sharp(buffer)
      .jpeg({ quality: 85 })
      .toBuffer();
    
    fs.writeFileSync(filepath, jpegBuffer);
  }

  /**
   * Create a no-image marker file
   * Requirement 9.5: Marker file to avoid repeated fetch attempts
   */
  private createNoImageMarker(bggId: number): void {
    const markerPath = this.getNoImageMarkerPath(bggId);
    fs.writeFileSync(markerPath, '');
  }

  /**
   * Check if a fetch is currently in progress for a BGG ID
   */
  isInFlight(bggId: number): boolean {
    return this.fetchQueue.isInFlight(bggId);
  }

  /**
   * Get the cache directory path (for testing)
   */
  getCacheDir(): string {
    return this.cacheDir;
  }
}

// Export singleton instance
export const bggImageService = new BggImageService();
export { BggImageService };
