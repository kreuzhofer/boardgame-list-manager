/**
 * BggEnrichmentService - Service for enriching BGG game data via page scraping
 * 
 * Requirements: 4.1-4.5, 5.5, 6.1-6.5, 6a.1-6a.4, 6b.1-6b.6, 6c.1-6c.5, 7.1-7.5
 */

import { prisma } from '../lib/prisma';
import { bggCache } from './bggCache';
import pageFetchService, { ScraperApiError } from './pageFetchService';

export interface EnrichmentData {
  alternateNames: Array<{ name: string; language?: string }>;
  primaryName: string;
  description: string;
  shortDescription: string;
  slug: string;
  designers: string[];
  artists: string[];
  publishers: string[];
  categories: string[];
  mechanics: string[];
}

export interface BulkEnrichmentStatus {
  running: boolean;
  processed: number;
  total: number;
  skipped: number;
  errors: number;
  bytesTransferred: number;
  etaSeconds: number | null;
  startedAt?: Date;
  completedAt?: Date;
  stopReason?: string;
}

class BggEnrichmentService {
  private bulkStatus: BulkEnrichmentStatus = {
    running: false,
    processed: 0,
    total: 0,
    skipped: 0,
    errors: 0,
    bytesTransferred: 0,
    etaSeconds: null,
  };

  private stopRequested: boolean = false;
  
  // Error handling constants
  private static readonly MAX_CONSECUTIVE_ERRORS = 10;
  private static readonly RATE_LIMIT_DELAY_MS = 5000; // Wait 5s on 429
  private static readonly MAX_RETRIES = 3;

  constructor() {}


  /**
   * Start bulk enrichment process (returns immediately)
   * Requirement 6a.1: Start background process, return 202
   */
  startBulkEnrichment(): { started: boolean; message: string } {
    if (this.bulkStatus.running) {
      return { started: false, message: 'Bulk enrichment already in progress' };
    }

    this.bulkStatus = {
      running: true,
      processed: 0,
      total: 0,
      skipped: 0,
      errors: 0,
      bytesTransferred: 0,
      etaSeconds: null,
      startedAt: new Date(),
    };

    this.stopRequested = false;

    // Start background process
    this.processBulkEnrichment().catch((error) => {
      console.error('[BggEnrichment] Fatal error:', error);
      this.bulkStatus.running = false;
      this.bulkStatus.completedAt = new Date();
    });

    return { started: true, message: 'Bulk enrichment started' };
  }

  /**
   * Get bulk enrichment status
   * Requirement 6b.1, 6b.2: Return status with bytes transferred and ETA
   */
  getBulkStatus(): BulkEnrichmentStatus {
    if (this.bulkStatus.running) {
      this.bulkStatus.etaSeconds = this.calculateEta();
    }
    return { ...this.bulkStatus };
  }

  /**
   * Stop bulk enrichment process (graceful stop)
   * Requirement 6d.1, 6d.2, 6d.3, 6d.5
   */
  stopBulkEnrichment(): { stopped: boolean; message: string; status: BulkEnrichmentStatus } {
    if (!this.bulkStatus.running) {
      return {
        stopped: false,
        message: 'No bulk enrichment is running',
        status: this.getBulkStatus(),
      };
    }

    this.stopRequested = true;
    
    return {
      stopped: true,
      message: 'Stop requested - will complete current game and stop',
      status: this.getBulkStatus(),
    };
  }

  /**
   * Calculate ETA based on elapsed time and progress
   * Requirement 6b.5: Calculate ETA based on average processing rate
   */
  private calculateEta(): number | null {
    if (!this.bulkStatus.startedAt || this.bulkStatus.processed === 0 || this.bulkStatus.total === 0) {
      return null;
    }
    const elapsedMs = Date.now() - this.bulkStatus.startedAt.getTime();
    const elapsedSeconds = elapsedMs / 1000;
    const rate = this.bulkStatus.processed / elapsedSeconds;
    const remaining = this.bulkStatus.total - this.bulkStatus.processed;
    return Math.ceil(remaining / rate);
  }

  /**
   * Format duration for logging
   */
  private formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  }

  /**
   * Format bytes for logging
   * Requirement 6c.4: Format as KB/MB/GB
   */
  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }


  /**
   * Fetch BGG page HTML using configured fetch providers
   * Requirement 4.1, 6c.1: Fetch page and track response size
   */
  async fetchBggPage(bggId: number): Promise<{ html: string; bytes: number }> {
    const result = await pageFetchService.fetchBggPage(bggId);
    return { html: result.html, bytes: result.bytes };
  }

  /**
   * Extract enrichment data from BGG page HTML
   * Requirements 4.2, 4.3, 7.1, 7.2, 7.3, 7.4, 7.5
   */
  extractEnrichmentData(html: string): EnrichmentData {
    // Extract GEEK.geekitemPreload JSON
    const geekitemMatch = html.match(/GEEK\.geekitemPreload\s*=\s*(\{[\s\S]*?\});[\s\n]*GEEK\.geekitemSettings/);
    
    if (!geekitemMatch) {
      throw new Error('Could not find GEEK.geekitemPreload in HTML');
    }
    
    let geekitem: any;
    try {
      geekitem = JSON.parse(geekitemMatch[1]);
    } catch (e) {
      throw new Error('Failed to parse GEEK.geekitemPreload JSON: ' + (e as Error).message);
    }
    
    const item = geekitem.item;
    if (!item) {
      throw new Error('No item found in GEEK.geekitemPreload');
    }
    
    // Extract alternate names
    const alternateNames: Array<{ name: string; language?: string }> = [];
    if (Array.isArray(item.alternatenames)) {
      for (const alt of item.alternatenames) {
        if (alt.name) {
          alternateNames.push({
            name: alt.name,
            language: alt.nameid ? undefined : alt.language,
          });
        }
      }
    }
    
    // Extract linked entities from links object
    const links = item.links || {};
    const extractNames = (linkType: string): string[] => {
      const linkArray = links[linkType];
      if (!Array.isArray(linkArray)) return [];
      return linkArray.map((l: any) => l.name).filter(Boolean);
    };
    
    // Sanitize HTML in description
    const sanitizeHtml = (html: string): string => {
      if (!html) return '';
      // Remove script tags and event handlers
      return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    };
    
    return {
      alternateNames,
      primaryName: item.name || '',
      description: sanitizeHtml(item.description || ''),
      shortDescription: item.short_description || '',
      slug: item.href || '',
      designers: extractNames('boardgamedesigner'),
      artists: extractNames('boardgameartist'),
      publishers: extractNames('boardgamepublisher'),
      categories: extractNames('boardgamecategory'),
      mechanics: extractNames('boardgamemechanic'),
    };
  }


  /**
   * Enrich a single game
   * Requirements 6.1, 6.3, 5.5
   */
  async enrichGame(bggId: number, force: boolean = false): Promise<EnrichmentData> {
    // Check if game exists
    const game = await prisma.bggGame.findUnique({
      where: { id: bggId },
    });
    
    if (!game) {
      throw new Error(`Game with BGG ID ${bggId} not found`);
    }
    
    // Skip if already enriched (unless force)
    if (game.scrapingDone && !force) {
      if (game.enrichmentData) {
        return game.enrichmentData as unknown as EnrichmentData;
      }
    }
    
    // Fetch and parse BGG page
    const { html } = await this.fetchBggPage(bggId);
    const enrichmentData = this.extractEnrichmentData(html);
    
    // Store enrichment data
    await prisma.bggGame.update({
      where: { id: bggId },
      data: {
        scrapingDone: true,
        enrichedAt: new Date(),
        enrichmentData: enrichmentData as any,
      },
    });
    
    // Update in-memory cache with new alternate names
    const alternateNames = enrichmentData.alternateNames.map(a => a.name);
    bggCache.updateGameAlternateNames(bggId, alternateNames);
    
    return enrichmentData;
  }

  /**
   * Process bulk enrichment in background
   * Requirements 6a.3, 6a.4, 6b.6, 6c.3, 6c.4
   */
  private async processBulkEnrichment(): Promise<void> {
    const LOG_INTERVAL_MS = 60000; // Log every 60 seconds
    const DELAY_MS = 1000; // 1 second between requests
    
    // Get count of games needing enrichment and already enriched
    const [needingEnrichment, alreadyEnriched] = await Promise.all([
      prisma.bggGame.count({ where: { scrapingDone: false } }),
      prisma.bggGame.count({ where: { scrapingDone: true } }),
    ]);
    
    this.bulkStatus.total = needingEnrichment;
    this.bulkStatus.skipped = alreadyEnriched;
    console.log(`[BggEnrichment] Starting bulk enrichment of ${needingEnrichment} games (${alreadyEnriched} already enriched)`);
    
    // Get all games needing enrichment, sorted by year_published DESC (newest first)
    // Requirement 6a.5: Sort by year_published descending so newer games are enriched first
    const games = await prisma.bggGame.findMany({
      where: { scrapingDone: false },
      select: { id: true, yearPublished: true },
      orderBy: { yearPublished: 'desc' },
    });
    
    let lastLogTime = Date.now();
    let consecutiveErrors = 0;
    
    for (const game of games) {
      // Check for stop request before processing each game
      if (this.stopRequested) {
        this.finishBulkEnrichment('Stopped by user');
        return;
      }

      try {
        const result = await this.fetchWithRetry(game.id);
        this.bulkStatus.bytesTransferred += result.bytes;
        
        const enrichmentData = this.extractEnrichmentData(result.html);
        
        await prisma.bggGame.update({
          where: { id: game.id },
          data: {
            scrapingDone: true,
            enrichedAt: new Date(),
            enrichmentData: enrichmentData as any,
          },
        });
        
        // Update in-memory cache with new alternate names
        const alternateNames = enrichmentData.alternateNames.map(a => a.name);
        bggCache.updateGameAlternateNames(game.id, alternateNames);
        
        this.bulkStatus.processed++;
        consecutiveErrors = 0; // Reset on success
        
        // Log progress every 60 seconds
        const now = Date.now();
        if (now - lastLogTime >= LOG_INTERVAL_MS) {
          lastLogTime = now;
          const eta = this.calculateEta();
          const etaStr = eta ? this.formatDuration(eta) : 'calculating...';
          console.log(
            `[BggEnrichment] Progress: ${this.bulkStatus.processed}/${this.bulkStatus.total} games enriched ` +
            `(${this.bulkStatus.skipped} skipped, ${this.bulkStatus.errors} errors) - ` +
            `${this.formatBytes(this.bulkStatus.bytesTransferred)} transferred - ETA: ${etaStr}`
          );
        }
        
        // Delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        
      } catch (error) {
        this.bulkStatus.errors++;
        consecutiveErrors++;
        
        // Check for fatal ScraperAPI errors (credits exhausted)
        if (error instanceof ScraperApiError && error.isFatal) {
          console.error(`[BggEnrichment] Fatal error: ${error.message}`);
          this.finishBulkEnrichment(`ScraperAPI error: ${error.message}`);
          return;
        }
        
        // Check consecutive error threshold
        if (consecutiveErrors >= BggEnrichmentService.MAX_CONSECUTIVE_ERRORS) {
          console.error(`[BggEnrichment] Too many consecutive errors (${consecutiveErrors}), stopping`);
          this.finishBulkEnrichment(`Too many consecutive errors (${consecutiveErrors})`);
          return;
        }
        
        console.error(`[BggEnrichment] Error enriching game ${game.id}:`, error);
        // Continue with next game
      }
    }
    
    this.finishBulkEnrichment('Completed');
  }

  /**
   * Fetch with retry logic for rate limiting (429)
   */
  private async fetchWithRetry(bggId: number): Promise<{ html: string; bytes: number }> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= BggEnrichmentService.MAX_RETRIES; attempt++) {
      try {
        return await this.fetchBggPage(bggId);
      } catch (error) {
        lastError = error as Error;
        
        // Only retry on 429 (rate limit)
        if (error instanceof ScraperApiError && error.shouldRetry) {
          console.log(`[BggEnrichment] Rate limited, waiting ${BggEnrichmentService.RATE_LIMIT_DELAY_MS}ms before retry ${attempt}/${BggEnrichmentService.MAX_RETRIES}`);
          await new Promise(resolve => setTimeout(resolve, BggEnrichmentService.RATE_LIMIT_DELAY_MS));
          continue;
        }
        
        // Don't retry other errors
        throw error;
      }
    }
    
    throw lastError;
  }

  /**
   * Finish bulk enrichment and log summary
   */
  private finishBulkEnrichment(reason: string): void {
    this.bulkStatus.running = false;
    this.bulkStatus.completedAt = new Date();
    this.bulkStatus.etaSeconds = null;
    this.bulkStatus.stopReason = reason;
    
    const elapsed = this.bulkStatus.completedAt.getTime() - (this.bulkStatus.startedAt?.getTime() || 0);
    console.log(
      `[BggEnrichment] ${reason}: ${this.bulkStatus.processed} games enriched ` +
      `(${this.bulkStatus.skipped} skipped, ${this.bulkStatus.errors} errors) ` +
      `in ${this.formatDuration(Math.floor(elapsed / 1000))} - ` +
      `Total data transferred: ${this.formatBytes(this.bulkStatus.bytesTransferred)}`
    );
  }
}

// Export singleton instance
export const bggEnrichmentService = new BggEnrichmentService();
export { BggEnrichmentService };
