/**
 * BggCache service - loads and caches BoardGameGeek data from CSV
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.2, 2.3
 */

import { parse } from 'csv-parse';
import * as fs from 'fs';
import * as path from 'path';

export interface BggGame {
  id: number;
  name: string;
  yearPublished: number | null;
  rank: number;
}

interface CsvRow {
  id: string;
  name: string;
  yearpublished: string;
  rank: string;
  is_expansion: string;
}

/**
 * Singleton cache for BGG game data
 * Loads CSV at startup and provides fast in-memory search
 */
class BggCache {
  private games: BggGame[] = [];
  private loaded = false;

  /**
   * Initialize the cache by loading and parsing the CSV file
   * Requirement 1.1: Read CSV at startup
   * Requirement 1.3: Exclude expansions (is_expansion=1)
   * Requirement 1.4: Log error and continue with empty cache if file cannot be read
   */
  async initialize(csvPath: string): Promise<void> {
    try {
      const absolutePath = path.resolve(csvPath);
      
      if (!fs.existsSync(absolutePath)) {
        console.error(`BGG CSV file not found: ${absolutePath}`);
        this.games = [];
        this.loaded = true;
        return;
      }

      const fileContent = fs.readFileSync(absolutePath, 'utf-8');
      
      return new Promise((resolve) => {
        const parser = parse(fileContent, {
          columns: true,
          skip_empty_lines: true,
          relax_column_count: true,
        });

        const games: BggGame[] = [];

        parser.on('data', (row: CsvRow) => {
          // Requirement 1.3: Exclude expansions
          if (row.is_expansion === '1') {
            return;
          }

          const id = parseInt(row.id, 10);
          const rank = parseInt(row.rank, 10);
          const yearPublished = row.yearpublished ? parseInt(row.yearpublished, 10) : null;

          // Skip invalid rows
          if (isNaN(id) || isNaN(rank)) {
            return;
          }

          // Requirement 1.2: Store id, name, yearpublished
          games.push({
            id,
            name: row.name,
            yearPublished: yearPublished && !isNaN(yearPublished) ? yearPublished : null,
            rank,
          });
        });

        parser.on('error', (err) => {
          console.error('Error parsing BGG CSV:', err.message);
          this.games = [];
          this.loaded = true;
          resolve();
        });

        parser.on('end', () => {
          // Sort by rank for efficient search results
          this.games = games.sort((a, b) => a.rank - b.rank);
          this.loaded = true;
          console.log(`BGG cache loaded: ${this.games.length} games`);
          resolve();
        });
      });
    } catch (error) {
      // Requirement 1.4: Log error and continue with empty cache
      console.error('Failed to load BGG CSV:', error instanceof Error ? error.message : error);
      this.games = [];
      this.loaded = true;
    }
  }

  /**
   * Search games by name with case-insensitive partial matching
   * Requirement 2.2: Case-insensitive partial matching
   * Requirement 2.3: Return max 10 results sorted by rank (ascending)
   */
  search(query: string, maxResults: number = 10): BggGame[] {
    if (!this.loaded || !query) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    
    // Filter games that contain the query (case-insensitive)
    const matches = this.games.filter(game => 
      game.name.toLowerCase().includes(lowerQuery)
    );

    // Games are already sorted by rank, just limit results
    return matches.slice(0, maxResults);
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
   * Reset cache (for testing purposes)
   */
  reset(): void {
    this.games = [];
    this.loaded = false;
  }

  /**
   * Load games directly (for testing purposes)
   */
  loadGames(games: BggGame[]): void {
    this.games = games.sort((a, b) => a.rank - b.rank);
    this.loaded = true;
  }
}

// Export singleton instance
export const bggCache = new BggCache();
export { BggCache };
