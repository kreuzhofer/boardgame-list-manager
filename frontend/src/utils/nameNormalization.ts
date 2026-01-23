/**
 * Name normalization utility for game name comparison
 * Used for duplicate detection and search matching
 * Requirements: 5.6
 */

/**
 * Normalizes a game name for comparison.
 * Converts to lowercase, trims, and collapses multiple spaces.
 * 
 * @param name - The game name to normalize
 * @returns The normalized name
 * 
 * @example
 * normalizeName("  Catan  ") // "catan"
 * normalizeName("CATAN") // "catan"
 * normalizeName("Catan   Junior") // "catan junior"
 */
export function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}
