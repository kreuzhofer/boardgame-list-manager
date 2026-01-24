/**
 * Fuzzy matching module for game name search
 * Implements multi-strategy matching with scoring
 * 
 * Feature: 011-fuzzy-search
 * Requirements: 1.1, 2.1, 3.1, 4.1, 4.2, 4.3, 4.4
 */

import { normalizeName, normalizePunctuation, tokenize } from './nameNormalization';

/**
 * Match result with score for ranking
 */
export interface FuzzyMatchResult {
  matched: boolean;
  score: number; // 0-100, higher is better
  matchType: 'exact' | 'punctuation' | 'word-order' | 'edit-distance' | 'none';
}

/**
 * Configuration for fuzzy matching behavior
 */
export interface FuzzyMatchConfig {
  enableEditDistance: boolean;
  maxEditDistance: number; // Maximum allowed edit distance
  minQueryLength: number; // Minimum query length for edit distance
}

/**
 * Default configuration for fuzzy matching
 */
export const DEFAULT_FUZZY_CONFIG: FuzzyMatchConfig = {
  enableEditDistance: true,
  maxEditDistance: 2,
  minQueryLength: 4,
};


/**
 * Calculates Levenshtein edit distance between two strings.
 * Uses optimized algorithm with early termination when distance exceeds maxDistance.
 * 
 * @param a - First string
 * @param b - Second string
 * @param maxDistance - Optional maximum distance for early termination
 * @returns The edit distance, or maxDistance + 1 if exceeded
 * 
 * @example
 * editDistance("catan", "cataan") // 1
 * editDistance("catan", "katan") // 1
 * editDistance("brass", "glass") // 2
 */
export function editDistance(a: string, b: string, maxDistance?: number): number {
  // Early termination for identical strings
  if (a === b) return 0;

  const lenA = a.length;
  const lenB = b.length;

  // Early termination based on length difference
  if (maxDistance !== undefined && Math.abs(lenA - lenB) > maxDistance) {
    return maxDistance + 1;
  }

  // Ensure a is the shorter string for space optimization
  if (lenA > lenB) {
    [a, b] = [b, a];
  }

  const len1 = a.length;
  const len2 = b.length;

  // Use single array for space optimization (O(min(m,n)) space)
  let prevRow = new Array(len1 + 1);
  let currRow = new Array(len1 + 1);

  // Initialize first row
  for (let i = 0; i <= len1; i++) {
    prevRow[i] = i;
  }

  for (let j = 1; j <= len2; j++) {
    currRow[0] = j;
    let minInRow = j;

    for (let i = 1; i <= len1; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[i] = Math.min(
        prevRow[i] + 1, // deletion
        currRow[i - 1] + 1, // insertion
        prevRow[i - 1] + cost // substitution
      );
      minInRow = Math.min(minInRow, currRow[i]);
    }

    // Early termination if minimum in row exceeds maxDistance
    if (maxDistance !== undefined && minInRow > maxDistance) {
      return maxDistance + 1;
    }

    // Swap rows
    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[len1];
}


/**
 * Checks if all query words appear in the game name (in any order).
 * Each query word must appear as a substring of some word in the game name.
 * 
 * @param queryTokens - Tokenized query words
 * @param nameTokens - Tokenized game name words
 * @returns true if all query words are found
 */
function matchesWordOrder(queryTokens: string[], nameTokens: string[]): boolean {
  if (queryTokens.length === 0) return false;

  // Each query token must appear as substring in at least one name token
  return queryTokens.every((queryWord) =>
    nameTokens.some((nameWord) => nameWord.includes(queryWord))
  );
}

/**
 * Calculates edit distance score (40-59) based on distance.
 * Lower distance = higher score.
 * 
 * @param distance - The edit distance
 * @param maxDistance - Maximum allowed distance
 * @returns Score between 40-59
 */
function calculateEditDistanceScore(distance: number, maxDistance: number): number {
  // Score ranges from 59 (distance=1) to 40 (distance=maxDistance)
  const scoreRange = 59 - 40;
  const normalizedDistance = (distance - 1) / Math.max(1, maxDistance - 1);
  return Math.round(59 - normalizedDistance * scoreRange);
}

/**
 * Determines if query matches game name using multi-strategy approach.
 * Strategies are tried in order of precision:
 * 1. Exact substring match (score: 100)
 * 2. Punctuation-normalized match (score: 80)
 * 3. Word-order independent match (score: 60)
 * 4. Edit distance match (score: 40-59)
 * 
 * @param query - The search query
 * @param gameName - The game name to match against
 * @param config - Optional configuration overrides
 * @returns Match result with score and match type
 * 
 * @example
 * fuzzyMatch("Brass Birmingham", "Brass: Birmingham") // { matched: true, score: 80, matchType: 'punctuation' }
 * fuzzyMatch("Birmingham Brass", "Brass: Birmingham") // { matched: true, score: 60, matchType: 'word-order' }
 * fuzzyMatch("Cataan", "Catan") // { matched: true, score: 59, matchType: 'edit-distance' }
 */
export function fuzzyMatch(
  query: string,
  gameName: string,
  config?: Partial<FuzzyMatchConfig>
): FuzzyMatchResult {
  const cfg = { ...DEFAULT_FUZZY_CONFIG, ...config };

  // Normalize inputs
  const normalizedQuery = normalizeName(query);
  const normalizedName = normalizeName(gameName);

  // Empty query never matches
  if (!normalizedQuery) {
    return { matched: false, score: 0, matchType: 'none' };
  }

  // Strategy 1: Exact substring match (score: 100)
  if (normalizedName.includes(normalizedQuery)) {
    return { matched: true, score: 100, matchType: 'exact' };
  }

  // Strategy 2: Punctuation-normalized match (score: 80)
  const punctNormalizedQuery = normalizePunctuation(query);
  const punctNormalizedName = normalizePunctuation(gameName);

  if (punctNormalizedName.includes(punctNormalizedQuery)) {
    return { matched: true, score: 80, matchType: 'punctuation' };
  }

  // Strategy 3: Word-order independent match (score: 60)
  const queryTokens = tokenize(punctNormalizedQuery);
  const nameTokens = tokenize(punctNormalizedName);

  if (queryTokens.length > 0 && matchesWordOrder(queryTokens, nameTokens)) {
    return { matched: true, score: 60, matchType: 'word-order' };
  }

  // Strategy 4: Edit distance match (score: 40-59)
  if (cfg.enableEditDistance && normalizedQuery.length >= cfg.minQueryLength) {
    // Calculate dynamic max distance based on query length
    const dynamicMaxDistance = Math.min(
      cfg.maxEditDistance,
      Math.floor(normalizedQuery.length / 4) + 1
    );

    const distance = editDistance(punctNormalizedQuery, punctNormalizedName, dynamicMaxDistance);

    if (distance <= dynamicMaxDistance) {
      const score = calculateEditDistanceScore(distance, dynamicMaxDistance);
      return { matched: true, score, matchType: 'edit-distance' };
    }
  }

  // No match
  return { matched: false, score: 0, matchType: 'none' };
}
