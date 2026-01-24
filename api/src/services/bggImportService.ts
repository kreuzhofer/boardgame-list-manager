/**
 * BggImportService - Service for importing BGG CSV data into database
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.1, 3.3, 3a.1-3a.6
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';
import { prisma } from '../lib/prisma';

export interface ImportStatus {
  running: boolean;
  processed: number;
  total: number;
  errors: number;
  etaSeconds: number | null;
  startedAt?: Date;
  completedAt?: Date;
}

interface CsvRow {
  id: string;
  name: string;
  yearpublished: string;
  rank: string;
  bayesaverage: string;
  average: string;
  usersrated: string;
  is_expansion: string;
  abstracts_rank: string;
  cgs_rank: string;
  childrensgames_rank: string;
  familygames_rank: string;
  partygames_rank: string;
  strategygames_rank: string;
  thematic_rank: string;
  wargames_rank: string;
}

class BggImportService {
  private status: ImportStatus = {
    running: false,
    processed: 0,
    total: 0,
    errors: 0,
    etaSeconds: null,
  };

  private csvPath: string;

  constructor(csvPath?: string) {
    this.csvPath = csvPath || path.join(__dirname, '../../data/boardgames_ranks.csv');
  }


  /**
   * Start the import process (returns immediately)
   * Requirement 3.1: Start import in background, return 202
   */
  startImport(): { started: boolean; message: string } {
    if (this.status.running) {
      return { started: false, message: 'Import already in progress' };
    }

    this.status = {
      running: true,
      processed: 0,
      total: 0,
      errors: 0,
      etaSeconds: null,
      startedAt: new Date(),
    };

    // Start background process
    this.processImport().catch((error) => {
      console.error('[BggImport] Fatal error:', error);
      this.status.running = false;
      this.status.completedAt = new Date();
    });

    return { started: true, message: 'Import started' };
  }

  /**
   * Get current import status
   * Requirement 3a.1, 3a.2: Return status with ETA
   */
  getStatus(): ImportStatus {
    if (this.status.running) {
      this.status.etaSeconds = this.calculateEta();
    }
    return { ...this.status };
  }

  /**
   * Calculate ETA based on elapsed time and progress
   * Requirement 3a.5: Calculate ETA based on average processing rate
   */
  private calculateEta(): number | null {
    if (!this.status.startedAt || this.status.processed === 0 || this.status.total === 0) {
      return null;
    }
    const elapsedMs = Date.now() - this.status.startedAt.getTime();
    const elapsedSeconds = elapsedMs / 1000;
    const rate = this.status.processed / elapsedSeconds;
    const remaining = this.status.total - this.status.processed;
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
   * Parse a CSV row to database record
   * Requirement 1.1: Parse all columns with appropriate types
   */
  parseRow(row: CsvRow): {
    id: number;
    name: string;
    yearPublished: number | null;
    rank: number | null;
    bayesAverage: number | null;
    average: number | null;
    usersRated: number | null;
    isExpansion: boolean;
    abstractsRank: number | null;
    cgsRank: number | null;
    childrensGamesRank: number | null;
    familyGamesRank: number | null;
    partyGamesRank: number | null;
    strategyGamesRank: number | null;
    thematicRank: number | null;
    warGamesRank: number | null;
  } {
    const parseIntOrNull = (val: string): number | null => {
      if (!val || val === '') return null;
      const num = parseInt(val, 10);
      return isNaN(num) ? null : num;
    };

    const parseFloatOrNull = (val: string): number | null => {
      if (!val || val === '') return null;
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    };

    return {
      id: parseInt(row.id, 10),
      name: row.name,
      yearPublished: parseIntOrNull(row.yearpublished),
      rank: parseIntOrNull(row.rank),
      bayesAverage: parseFloatOrNull(row.bayesaverage),
      average: parseFloatOrNull(row.average),
      usersRated: parseIntOrNull(row.usersrated),
      isExpansion: row.is_expansion === '1',
      abstractsRank: parseIntOrNull(row.abstracts_rank),
      cgsRank: parseIntOrNull(row.cgs_rank),
      childrensGamesRank: parseIntOrNull(row.childrensgames_rank),
      familyGamesRank: parseIntOrNull(row.familygames_rank),
      partyGamesRank: parseIntOrNull(row.partygames_rank),
      strategyGamesRank: parseIntOrNull(row.strategygames_rank),
      thematicRank: parseIntOrNull(row.thematic_rank),
      warGamesRank: parseIntOrNull(row.wargames_rank),
    };
  }


  /**
   * Process the CSV file in batches
   * Requirements: 1.2, 1.4, 1.5, 3a.6
   */
  private async processImport(): Promise<void> {
    const BATCH_SIZE = 1000;
    const LOG_INTERVAL = 500;

    // Count total rows first
    const totalRows = await this.countCsvRows();
    this.status.total = totalRows;
    console.log(`[BggImport] Starting import of ${totalRows} rows`);

    const fileStream = fs.createReadStream(this.csvPath);
    const parser = fileStream.pipe(
      parse({
        columns: true,
        skip_empty_lines: true,
      })
    );

    let batch: ReturnType<typeof this.parseRow>[] = [];
    let rowCount = 0;

    for await (const row of parser) {
      try {
        const parsed = this.parseRow(row as CsvRow);
        batch.push(parsed);
        rowCount++;

        if (batch.length >= BATCH_SIZE) {
          await this.processBatch(batch);
          this.status.processed += batch.length;
          batch = [];
        }

        if (rowCount % LOG_INTERVAL === 0) {
          const eta = this.calculateEta();
          const etaStr = eta ? this.formatDuration(eta) : 'calculating...';
          console.log(
            `[BggImport] Progress: ${this.status.processed}/${this.status.total} rows processed (${this.status.errors} errors) - ETA: ${etaStr}`
          );
        }
      } catch (error) {
        this.status.errors++;
        console.error(`[BggImport] Error parsing row ${rowCount}:`, error);
      }
    }

    // Process remaining batch
    if (batch.length > 0) {
      await this.processBatch(batch);
      this.status.processed += batch.length;
    }

    this.status.running = false;
    this.status.completedAt = new Date();
    this.status.etaSeconds = null;

    const elapsed = this.status.completedAt.getTime() - (this.status.startedAt?.getTime() || 0);
    console.log(
      `[BggImport] Complete: ${this.status.processed} rows imported (${this.status.errors} errors) in ${this.formatDuration(Math.floor(elapsed / 1000))}`
    );
  }

  /**
   * Process a batch of rows using upsert to preserve enrichment data
   * Requirement 1.4: Upsert preserves scraping_done and enrichment_data
   */
  private async processBatch(batch: ReturnType<typeof this.parseRow>[]): Promise<void> {
    for (const row of batch) {
      try {
        await prisma.bggGame.upsert({
          where: { id: row.id },
          create: row,
          update: {
            name: row.name,
            yearPublished: row.yearPublished,
            rank: row.rank,
            bayesAverage: row.bayesAverage,
            average: row.average,
            usersRated: row.usersRated,
            isExpansion: row.isExpansion,
            abstractsRank: row.abstractsRank,
            cgsRank: row.cgsRank,
            childrensGamesRank: row.childrensGamesRank,
            familyGamesRank: row.familyGamesRank,
            partyGamesRank: row.partyGamesRank,
            strategyGamesRank: row.strategyGamesRank,
            thematicRank: row.thematicRank,
            warGamesRank: row.warGamesRank,
            // Note: scraping_done, enriched_at, enrichment_data are NOT updated
          },
        });
      } catch (error) {
        this.status.errors++;
        console.error(`[BggImport] Error upserting game ${row.id}:`, error);
      }
    }
  }

  /**
   * Count total rows in CSV file
   */
  private async countCsvRows(): Promise<number> {
    return new Promise((resolve, reject) => {
      let count = 0;
      const fileStream = fs.createReadStream(this.csvPath);
      const parser = fileStream.pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
        })
      );

      parser.on('data', () => count++);
      parser.on('end', () => resolve(count));
      parser.on('error', reject);
    });
  }
}

// Export singleton instance
export const bggImportService = new BggImportService();
export { BggImportService };
