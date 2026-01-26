/**
 * BggCache service - loads and caches BoardGameGeek data from CSV or database
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.2, 2.3
 * Feature: 011-fuzzy-search - Enhanced with fuzzy matching
 * Feature: 014-alternate-names-search - Database loading with alternate names
 */

import { parse } from 'csv-parse';
import * as fs from 'fs';
import * as path from 'path';
import { fuzzyMatch } from './fuzzyMatch';
import { prisma } from '../lib/prisma';

export interface BggGame {
  id: number;
  name: string;
  yearPublished: number | null;
  rank: number;
  rating: number | null;
}

/**
 * Extended BggGame with alternate names from enrichment data
 * Feature: 014-alternate-names-search
 */
export interface BggGameWithAlternates extends BggGame {
  alternateNames: string[];
}

/**
 * Entry in the alternate name index
 * Feature: 014-alternate-names-search
 */
export interface AlternateNameEntry {
  gameId: number;
  alternateName: string;      // Original (non-normalized) name
  normalizedName: string;     // Lowercase, trimmed for matching
}

/**
 * Search result with alternate name information
 * Feature: 014-alternate-names-search
 */
export interface BggSearchResultWithAlt {
  id: number;
  name: string;
  yearPublished: number | null;
  rating: number | null;
  matchedAlternateName: string | null;
  alternateNames: string[];
}

interface CsvRow {
  id: string;
  name: string;
  yearpublished: string;
  rank: string;
  is_expansion: string;
  average: string;
}

/**
 * Singleton cache for BGG game data
 * Loads from CSV or database at startup and provides fast in-memory search
 * Feature: 014-alternate-names-search - Enhanced with database loading and alternate names
 */
class BggCache {
  private games: BggGameWithAlternates[] = [];
  private alternateNameIndex: Map<string, AlternateNameEntry[]> = new Map();
  private dataSource: 'csv' | 'database' = 'csv';
  private loaded = false;

  /**
   * Count non-expansion rows in CSV file
   * Feature: 014-alternate-names-search, Requirement 1.1
   */
  async countCsvRows(csvPath: string): Promise<number> {
    try {
      const absolutePath = path.resolve(csvPath);
      
      if (!fs.existsSync(absolutePath)) {
        console.error(`BGG CSV file not found: ${absolutePath}`);
        return 0;
      }

      const fileContent = fs.readFileSync(absolutePath, 'utf-8');
      
      return new Promise((resolve) => {
        const parser = parse(fileContent, {
          columns: true,
          skip_empty_lines: true,
          relax_column_count: true,
        });

        let count = 0;

        parser.on('data', (row: CsvRow) => {
          // Only count non-expansions
          if (row.is_expansion !== '1') {
            count++;
          }
        });

        parser.on('error', (err) => {
          console.error('Error counting CSV rows:', err.message);
          resolve(0);
        });

        parser.on('end', () => {
          resolve(count);
        });
      });
    } catch (error) {
      console.error('Failed to count CSV rows:', error instanceof Error ? error.message : error);
      return 0;
    }
  }

  /**
   * Count non-expansion rows in database
   * Feature: 014-alternate-names-search, Requirement 1.2
   */
  async countDbRows(): Promise<number> {
    try {
      console.log('Querying BggGame table for non-expansion count...');
      const count = await prisma.bggGame.count({
        where: {
          isExpansion: false,
        },
      });
      console.log(`Database BggGame count (non-expansions): ${count}`);
      return count;
    } catch (error) {
      console.error('Failed to count DB rows:', error instanceof Error ? error.message : error);
      if (error instanceof Error && error.message.includes('does not exist')) {
        console.error('→ BggGame table may not exist. Run prisma migrate or import data.');
      }
      return 0;
    }
  }

  /**
   * Load games from database with enrichment data
   * Feature: 014-alternate-names-search, Requirements 2.1, 2.2, 2.3
   */
  private async loadFromDatabase(): Promise<void> {
    try {
      const dbGames = await prisma.bggGame.findMany({
        where: {
          isExpansion: false,
        },
        orderBy: {
          yearPublished: { sort: 'desc', nulls: 'last' },
        },
      });

      this.games = dbGames.map((dbGame) => {
        // Extract alternate names from enrichment_data
        let alternateNames: string[] = [];
        
        if (dbGame.enrichmentData && typeof dbGame.enrichmentData === 'object') {
          const enrichment = dbGame.enrichmentData as { alternateNames?: Array<{ name: string }> };
          if (Array.isArray(enrichment.alternateNames)) {
            alternateNames = enrichment.alternateNames
              .map((alt) => alt.name)
              .filter((name): name is string => typeof name === 'string' && name.trim() !== '');
          }
        }

        return {
          id: dbGame.id,
          name: dbGame.name,
          yearPublished: dbGame.yearPublished,
          rank: dbGame.rank ?? 0,
          rating: dbGame.average ? Math.round(dbGame.average * 10) / 10 : null,
          alternateNames,
        };
      });

      // Build the alternate name index
      this.buildAlternateNameIndex();

      console.log(`BGG cache loaded from database: ${this.games.length} games`);
    } catch (error) {
      console.error('Failed to load from database:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Build index mapping alternate names to game entries
   * Feature: 014-alternate-names-search, Requirements 2.4, 2.5
   */
  private buildAlternateNameIndex(): void {
    this.alternateNameIndex.clear();

    for (const game of this.games) {
      for (const alternateName of game.alternateNames) {
        const normalizedName = alternateName.toLowerCase().trim();
        
        if (!normalizedName) continue;

        const entry: AlternateNameEntry = {
          gameId: game.id,
          alternateName,
          normalizedName,
        };

        const existing = this.alternateNameIndex.get(normalizedName);
        if (existing) {
          existing.push(entry);
        } else {
          this.alternateNameIndex.set(normalizedName, [entry]);
        }
      }
    }
  }

  /**
   * Initialize the cache by loading from database or CSV
   * Feature: 014-alternate-names-search, Requirements 1.3, 1.4, 1.5
   */
  async initialize(csvPath: string): Promise<void> {
    console.log('=== BGG Cache Initialization ===');
    console.log(`CSV path: ${csvPath}`);
    
    try {
      // Count rows in both sources
      console.log('Counting rows in CSV and database...');
      const [csvCount, dbCount] = await Promise.all([
        this.countCsvRows(csvPath),
        this.countDbRows(),
      ]);

      console.log(`Data source detection: CSV=${csvCount} rows, DB=${dbCount} rows`);
      console.log(`Decision criteria: DB >= CSV && DB > 0 → ${dbCount >= csvCount && dbCount > 0}`);

      // Select data source: use database if it has >= CSV rows
      if (dbCount >= csvCount && dbCount > 0) {
        this.dataSource = 'database';
        console.log('✓ Selected data source: DATABASE (has enrichment data + alternate names)');
        await this.loadFromDatabase();
      } else {
        this.dataSource = 'csv';
        console.log('✓ Selected data source: CSV (database not populated or has fewer rows)');
        await this.loadFromCsv(csvPath);
      }

      this.loaded = true;
      console.log(`=== BGG Cache Ready: ${this.games.length} games from ${this.dataSource.toUpperCase()} ===`);
    } catch (error) {
      // Fallback to CSV on any error
      console.error('Error during initialization, falling back to CSV:', error instanceof Error ? error.message : error);
      this.dataSource = 'csv';
      await this.loadFromCsv(csvPath);
      this.loaded = true;
      console.log(`=== BGG Cache Ready (fallback): ${this.games.length} games from CSV ===`);
    }
  }

  /**
   * Load games from CSV file (original implementation)
   */
  private async loadFromCsv(csvPath: string): Promise<void> {
    try {
      const absolutePath = path.resolve(csvPath);
      
      if (!fs.existsSync(absolutePath)) {
        console.error(`BGG CSV file not found: ${absolutePath}`);
        this.games = [];
        return;
      }

      const fileContent = fs.readFileSync(absolutePath, 'utf-8');
      
      return new Promise((resolve) => {
        const parser = parse(fileContent, {
          columns: true,
          skip_empty_lines: true,
          relax_column_count: true,
        });

        const games: BggGameWithAlternates[] = [];

        parser.on('data', (row: CsvRow) => {
          // Requirement 1.3: Exclude expansions
          if (row.is_expansion === '1') {
            return;
          }

          const id = parseInt(row.id, 10);
          const rank = parseInt(row.rank, 10);
          const yearPublished = row.yearpublished ? parseInt(row.yearpublished, 10) : null;
          const rating = row.average ? parseFloat(row.average) : null;

          // Skip invalid rows
          if (isNaN(id) || isNaN(rank)) {
            return;
          }

          // CSV doesn't have alternate names
          games.push({
            id,
            name: row.name,
            yearPublished: yearPublished && !isNaN(yearPublished) ? yearPublished : null,
            rank,
            rating: rating && !isNaN(rating) ? Math.round(rating * 10) / 10 : null,
            alternateNames: [],
          });
        });

        parser.on('error', (err) => {
          console.error('Error parsing BGG CSV:', err.message);
          this.games = [];
          resolve();
        });

        parser.on('end', () => {
          // Sort by yearPublished descending (newest first), nulls last
          this.games = games.sort((a, b) => {
            if (a.yearPublished === null && b.yearPublished === null) return 0;
            if (a.yearPublished === null) return 1;
            if (b.yearPublished === null) return -1;
            return b.yearPublished - a.yearPublished;
          });
          console.log(`BGG cache loaded from CSV: ${this.games.length} games`);
          resolve();
        });
      });
    } catch (error) {
      console.error('Failed to load BGG CSV:', error instanceof Error ? error.message : error);
      this.games = [];
    }
  }

  /**
   * Search games by name with fuzzy matching, including alternate names
   * Feature: 014-alternate-names-search
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5
   */
  search(query: string, maxResults: number = 10): BggSearchResultWithAlt[] {
    if (!this.loaded || !query) {
      return [];
    }

    interface SearchMatch {
      game: BggGameWithAlternates;
      score: number;
      matchedAlternateName: string | null;
      isPrimaryMatch: boolean;
    }

    const primaryMatches: SearchMatch[] = [];
    const alternateMatches: SearchMatch[] = [];

    // Search primary names
    for (const game of this.games) {
      const result = fuzzyMatch(query, game.name);
      if (result.matched) {
        primaryMatches.push({
          game,
          score: result.score + 10, // Primary matches get +10 bonus
          matchedAlternateName: null,
          isPrimaryMatch: true,
        });
      }
    }

    // Search alternate names
    for (const game of this.games) {
      let bestAltMatch: { name: string; score: number } | null = null;

      for (const altName of game.alternateNames) {
        const result = fuzzyMatch(query, altName);
        if (result.matched) {
          if (!bestAltMatch || result.score > bestAltMatch.score) {
            bestAltMatch = { name: altName, score: result.score };
          }
        }
      }

      if (bestAltMatch) {
        alternateMatches.push({
          game,
          score: bestAltMatch.score,
          matchedAlternateName: bestAltMatch.name,
          isPrimaryMatch: false,
        });
      }
    }

    // Merge and deduplicate: primary matches take precedence
    const byGameId = new Map<number, SearchMatch>();

    // Add primary matches first
    for (const match of primaryMatches) {
      byGameId.set(match.game.id, match);
    }

    // Add alternate matches only if game not already matched by primary
    for (const match of alternateMatches) {
      if (!byGameId.has(match.game.id)) {
        const existing = byGameId.get(match.game.id);
        if (!existing || match.score > existing.score) {
          byGameId.set(match.game.id, match);
        }
      }
    }

    // Sort by score descending, then by year descending
    const sortedMatches = Array.from(byGameId.values()).sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const yearA = a.game.yearPublished ?? 0;
      const yearB = b.game.yearPublished ?? 0;
      return yearB - yearA;
    });

    // Convert to result format
    return sortedMatches.slice(0, maxResults).map((match) => ({
      id: match.game.id,
      name: match.game.name,
      yearPublished: match.game.yearPublished,
      rating: match.game.rating,
      matchedAlternateName: match.matchedAlternateName,
      alternateNames: match.game.alternateNames,
    }));
  }

  /**
   * Legacy search method for backward compatibility
   * Returns BggGame[] without alternate name info
   */
  searchLegacy(query: string, maxResults: number = 10): BggGame[] {
    return this.search(query, maxResults).map((result) => ({
      id: result.id,
      name: result.name,
      yearPublished: result.yearPublished,
      rank: 0, // Not available in new format
      rating: result.rating,
    }));
  }

  /**
   * Check if cache is loaded
   * Requirement 1.5: Cache remains in memory for lifetime of process
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Get total count of cached games
   */
  getCount(): number {
    return this.games.length;
  }

  /**
   * Get the current data source
   * Feature: 014-alternate-names-search
   */
  getDataSource(): 'csv' | 'database' {
    return this.dataSource;
  }

  /**
   * Reset cache (for testing purposes)
   */
  reset(): void {
    this.games = [];
    this.alternateNameIndex.clear();
    this.dataSource = 'csv';
    this.loaded = false;
  }

  /**
   * Load games directly (for testing purposes)
   * Sorts by yearPublished descending (newest first), nulls last
   */
  loadGames(games: BggGameWithAlternates[]): void {
    this.games = games.sort((a, b) => {
      if (a.yearPublished === null && b.yearPublished === null) return 0;
      if (a.yearPublished === null) return 1;
      if (b.yearPublished === null) return -1;
      return b.yearPublished - a.yearPublished;
    });
    this.buildAlternateNameIndex();
    this.loaded = true;
  }

  /**
   * Set data source directly (for testing purposes)
   */
  setDataSource(source: 'csv' | 'database'): void {
    this.dataSource = source;
  }

  /**
   * Update alternate names for a single game in the cache
   * Called by enrichment service after enriching a game
   * Feature: 014-alternate-names-search - Live cache updates during enrichment
   */
  updateGameAlternateNames(gameId: number, alternateNames: string[]): void {
    // Find the game in the cache
    const game = this.games.find(g => g.id === gameId);
    if (!game) {
      // Game not in cache (might be an expansion or not loaded)
      return;
    }

    // Remove old alternate name entries from the index
    for (const oldAltName of game.alternateNames) {
      const normalizedName = oldAltName.toLowerCase().trim();
      const entries = this.alternateNameIndex.get(normalizedName);
      if (entries) {
        const filtered = entries.filter(e => e.gameId !== gameId);
        if (filtered.length === 0) {
          this.alternateNameIndex.delete(normalizedName);
        } else {
          this.alternateNameIndex.set(normalizedName, filtered);
        }
      }
    }

    // Update the game's alternate names
    game.alternateNames = alternateNames;

    // Add new alternate name entries to the index
    for (const alternateName of alternateNames) {
      const normalizedName = alternateName.toLowerCase().trim();
      if (!normalizedName) continue;

      const entry: AlternateNameEntry = {
        gameId,
        alternateName,
        normalizedName,
      };

      const existing = this.alternateNameIndex.get(normalizedName);
      if (existing) {
        existing.push(entry);
      } else {
        this.alternateNameIndex.set(normalizedName, [entry]);
      }
    }
  }
}

// Export singleton instance
export const bggCache = new BggCache();
export { BggCache };
