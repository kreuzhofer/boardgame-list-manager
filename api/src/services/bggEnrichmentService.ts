/**
 * BggEnrichmentService - Service for enriching BGG game data via page scraping
 * 
 * Requirements: 4.1-4.5, 5.5, 6.1-6.5, 6a.1-6a.4, 6b.1-6b.6, 6c.1-6c.5, 7.1-7.5
 */

import { prisma } from '../lib/prisma';
import { bggCache } from './bggCache';
import pageFetchService, { ScraperApiError } from './pageFetchService';
import { adminSseManager } from './adminSse.service';

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
  /** Game-stat fields read from `geekitemPreload.item`. BGG returns
   *  these as strings (e.g. "1", "150"); we parse to numbers and
   *  store undefined when absent or unparseable. `playingtime` is
   *  often null on BGG (Ark Nova has it null), so we don't capture
   *  it — display-side derives the time range from min/max instead. */
  minPlayers?: number;
  maxPlayers?: number;
  minPlaytime?: number;
  maxPlaytime?: number;
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
   * Start bulk enrichment process (returns immediately).
   *
   * @param options.force          - Reset `scraping_done` to false on the
   *                                 target set BEFORE the loop runs, so all
   *                                 games (or referenced ones) get re-fetched
   *                                 from BGG. Idempotent under server crash:
   *                                 the DB always reflects which rows are
   *                                 still pending; resume by clicking the
   *                                 normal (no-force) button.
   * @param options.onlyReferenced - Restrict the target set to BggGames
   *                                 referenced by any per-event Game row.
   *                                 Cuts ScraperAPI cost dramatically.
   * @param options.source         - 'bgg' (default) hits BGG via ScraperAPI;
   *                                 'cache' re-runs the extractor against the
   *                                 stored `raw_preload` blobs (no network).
   *
   * Requirement 6a.1: Start background process, return 202
   */
  async startBulkEnrichment(
    options: {
      force?: boolean;
      onlyReferenced?: boolean;
      source?: 'bgg' | 'cache';
    } = {},
  ): Promise<{ started: boolean; message: string }> {
    if (this.bulkStatus.running) {
      return { started: false, message: 'Bulk enrichment already in progress' };
    }

    const source = options.source ?? 'bgg';

    // For BGG-source runs with `force`: clear scraping_done on the target
    // set so the existing loop picks them up. Crash-resilient by design —
    // a server restart leaves enriched rows at true and the rest at false;
    // the normal (no-force) button resumes from there.
    if (source === 'bgg' && options.force) {
      if (options.onlyReferenced) {
        await prisma.$executeRaw`
          UPDATE bgg_games SET scraping_done = false
          WHERE id IN (SELECT DISTINCT bgg_id FROM games WHERE bgg_id IS NOT NULL)
        `;
      } else {
        await prisma.bggGame.updateMany({ data: { scrapingDone: false } });
      }
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

    const runner =
      source === 'cache'
        ? this.processBulkReextract.bind(this, options)
        : this.processBulkEnrichment.bind(this, options);

    runner().catch((error) => {
      console.error('[BggEnrichment] Fatal error:', error);
      this.bulkStatus.running = false;
      this.bulkStatus.completedAt = new Date();
    });

    return {
      started: true,
      message:
        source === 'cache'
          ? 'Cache-Re-Extraktion gestartet'
          : 'Bulk enrichment started',
    };
  }

  /** Distinct bggIds referenced by any per-event Game row. */
  private async getReferencedBggIds(): Promise<number[]> {
    const rows = await prisma.game.findMany({
      where: { bggId: { not: null } },
      select: { bggId: true },
      distinct: ['bggId'],
    });
    return rows
      .map((r) => r.bggId)
      .filter((id): id is number => typeof id === 'number');
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
    
    // Numeric stat fields (strings on BGG, undefined if absent/garbage).
    const parseStat = (v: unknown): number | undefined => {
      if (v === null || v === undefined || v === '') return undefined;
      const n = parseInt(String(v), 10);
      return Number.isFinite(n) && n > 0 ? n : undefined;
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
      minPlayers: parseStat(item.minplayers),
      maxPlayers: parseStat(item.maxplayers),
      minPlaytime: parseStat(item.minplaytime),
      maxPlaytime: parseStat(item.maxplaytime),
    };
  }

  /**
   * Same as extractEnrichmentData but also returns the raw
   * `geekitemPreload.item` blob, for persistence in `raw_preload`.
   * Storing the raw blob means future schema bumps are a re-extract
   * pass against this data, not another ScraperAPI roundtrip.
   */
  private extractEnrichmentAndRaw(html: string): {
    enrichment: EnrichmentData;
    rawPreload: unknown;
  } {
    const enrichment = this.extractEnrichmentData(html);
    const m = html.match(/GEEK\.geekitemPreload\s*=\s*(\{[\s\S]*?\});[\s\n]*GEEK\.geekitemSettings/);
    let rawPreload: unknown = null;
    if (m) {
      try {
        const parsed = JSON.parse(m[1]);
        rawPreload = parsed?.item ?? null;
      } catch {
        rawPreload = null;
      }
    }
    return { enrichment, rawPreload };
  }

  /**
   * Re-run the extractor against an existing `raw_preload` blob,
   * skipping BGG entirely. Returns the new EnrichmentData. Mirrors
   * `extractEnrichmentData(html)` but takes the parsed `item`
   * directly. Used by the "Aus Cache neu extrahieren" admin flow.
   */
  reextractFromRawPreload(item: any): EnrichmentData {
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
    const links = item.links || {};
    const extractNames = (linkType: string): string[] => {
      const arr = links[linkType];
      if (!Array.isArray(arr)) return [];
      return arr.map((l: any) => l.name).filter(Boolean);
    };
    const sanitizeHtml = (html: string): string => {
      if (!html) return '';
      return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    };
    const parseStat = (v: unknown): number | undefined => {
      if (v === null || v === undefined || v === '') return undefined;
      const n = parseInt(String(v), 10);
      return Number.isFinite(n) && n > 0 ? n : undefined;
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
      minPlayers: parseStat(item.minplayers),
      maxPlayers: parseStat(item.maxplayers),
      minPlaytime: parseStat(item.minplaytime),
      maxPlaytime: parseStat(item.maxplaytime),
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
    const { enrichment: enrichmentData, rawPreload } = this.extractEnrichmentAndRaw(html);

    // Store enrichment data + the raw blob (for future re-extraction)
    await prisma.bggGame.update({
      where: { id: bggId },
      data: {
        scrapingDone: true,
        enrichedAt: new Date(),
        enrichmentData: enrichmentData as any,
        rawPreload: rawPreload as any,
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
  private async processBulkEnrichment(
    options: { onlyReferenced?: boolean } = {},
  ): Promise<void> {
    const LOG_INTERVAL_MS = 60000; // Log every 60 seconds
    const DELAY_MS = 1000; // 1 second between requests

    // Build the WHERE clause. Always filters by scraping_done=false; the
    // optional `onlyReferenced` flag intersects with bggIds referenced
    // by any per-event Game row.
    const whereTodo: any = { scrapingDone: false };
    const whereDone: any = { scrapingDone: true };
    if (options.onlyReferenced) {
      const refs = await this.getReferencedBggIds();
      whereTodo.id = { in: refs };
      whereDone.id = { in: refs };
    }

    const [needingEnrichment, alreadyEnriched] = await Promise.all([
      prisma.bggGame.count({ where: whereTodo }),
      prisma.bggGame.count({ where: whereDone }),
    ]);

    this.bulkStatus.total = needingEnrichment;
    this.bulkStatus.skipped = alreadyEnriched;
    console.log(
      `[BggEnrichment] Starting bulk enrichment of ${needingEnrichment} games ` +
        `(${alreadyEnriched} already enriched${options.onlyReferenced ? ', referenced only' : ''})`,
    );

    // Get all games needing enrichment, sorted by year_published DESC (newest first)
    // Requirement 6a.5: Sort by year_published descending so newer games are enriched first
    const games = await prisma.bggGame.findMany({
      where: whereTodo,
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
        
        const { enrichment: enrichmentData, rawPreload } =
          this.extractEnrichmentAndRaw(result.html);

        await prisma.bggGame.update({
          where: { id: game.id },
          data: {
            scrapingDone: true,
            enrichedAt: new Date(),
            enrichmentData: enrichmentData as any,
            rawPreload: rawPreload as any,
          },
        });
        
        // Update in-memory cache with new alternate names
        const alternateNames = enrichmentData.alternateNames.map(a => a.name);
        bggCache.updateGameAlternateNames(game.id, alternateNames);
        
        this.bulkStatus.processed++;
        consecutiveErrors = 0; // Reset on success

        // Broadcast progress every 10 games
        if (this.bulkStatus.processed % 10 === 0 || this.bulkStatus.processed === this.bulkStatus.total) {
          adminSseManager.broadcast({
            type: 'bgg:enrich-progress',
            running: true,
            processed: this.bulkStatus.processed,
            total: this.bulkStatus.total,
            skipped: this.bulkStatus.skipped,
            errors: this.bulkStatus.errors,
            bytesTransferred: this.bulkStatus.bytesTransferred,
            etaSeconds: this.calculateEta(),
          });
        }

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
   * Re-extract enrichmentData from the stored `raw_preload` blobs.
   * Zero network — runs the existing extractor against rows we
   * already have. Used after the extractor learns a new field that
   * lives in the raw blob.
   */
  private async processBulkReextract(
    options: { onlyReferenced?: boolean } = {},
  ): Promise<void> {
    // Prisma requires `JsonNullValueFilter` for null-comparison on JSON
    // fields. `not: 'JsonNull'` matches any non-null JSONB value.
    const where: any = { rawPreload: { not: 'JsonNull' } };
    if (options.onlyReferenced) {
      const refs = await this.getReferencedBggIds();
      where.id = { in: refs };
    }

    const total = await prisma.bggGame.count({ where });
    this.bulkStatus.total = total;
    this.bulkStatus.skipped = 0;
    console.log(
      `[BggEnrichment] Cache re-extract over ${total} games` +
        (options.onlyReferenced ? ' (referenced only)' : ''),
    );

    // Iterate in batches; we sort by id for deterministic ordering and
    // page through with `skip`. Updates only mutate enrichmentData /
    // enrichedAt — the WHERE clause `rawPreload IS NOT NULL` still
    // matches every row across pages.
    const BATCH = 500;
    let cursor = 0;
    let lastBroadcast = 0;
    for (;;) {
      if (this.stopRequested) {
        this.finishBulkEnrichment('Stopped by user');
        return;
      }

      const batch = await prisma.bggGame.findMany({
        where,
        select: { id: true, rawPreload: true },
        orderBy: { id: 'asc' },
        skip: cursor,
        take: BATCH,
      });
      if (batch.length === 0) break;

      for (const row of batch) {
        try {
          const newEnrichment = this.reextractFromRawPreload(row.rawPreload);
          await prisma.bggGame.update({
            where: { id: row.id },
            data: {
              enrichmentData: newEnrichment as any,
              enrichedAt: new Date(),
            },
          });
          const altNames = newEnrichment.alternateNames.map((a) => a.name);
          bggCache.updateGameAlternateNames(row.id, altNames);
          this.bulkStatus.processed++;
        } catch (err) {
          this.bulkStatus.errors++;
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[BggEnrichment/cache] re-extract failed for ${row.id}: ${msg}`);
        }
      }
      cursor += batch.length;

      // Broadcast progress every ~1% or every 100 rows.
      if (this.bulkStatus.processed - lastBroadcast >= 100) {
        lastBroadcast = this.bulkStatus.processed;
        adminSseManager.broadcast({
          type: 'bgg:enrich-progress',
          running: true,
          processed: this.bulkStatus.processed,
          total: this.bulkStatus.total,
          skipped: this.bulkStatus.skipped,
          errors: this.bulkStatus.errors,
          bytesTransferred: this.bulkStatus.bytesTransferred,
          etaSeconds: this.calculateEta(),
        });
      }
    }

    this.finishBulkEnrichment('Cache re-extract completed');
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
    const durationSeconds = Math.floor(elapsed / 1000);
    console.log(
      `[BggEnrichment] ${reason}: ${this.bulkStatus.processed} games enriched ` +
      `(${this.bulkStatus.skipped} skipped, ${this.bulkStatus.errors} errors) ` +
      `in ${this.formatDuration(durationSeconds)} - ` +
      `Total data transferred: ${this.formatBytes(this.bulkStatus.bytesTransferred)}`
    );

    adminSseManager.broadcast({
      type: 'bgg:enrich-complete',
      processed: this.bulkStatus.processed,
      total: this.bulkStatus.total,
      skipped: this.bulkStatus.skipped,
      errors: this.bulkStatus.errors,
      bytesTransferred: this.bulkStatus.bytesTransferred,
      durationSeconds,
      stopReason: reason,
    });
  }
}

// Export singleton instance
export const bggEnrichmentService = new BggEnrichmentService();
export { BggEnrichmentService };
