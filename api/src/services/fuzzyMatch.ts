/**
 * Fuzzy matching utility for BGG search
 * Implements multi-strategy matching similar to frontend
 * 
 * Feature: 011-fuzzy-search
 */

/**
 * Normalizes a string for comparison.
 * Converts to lowercase, trims, and collapses multiple spaces.
 */
export function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Normalizes a string by removing common punctuation marks.
 */
export function normalizePunctuation(name: string): string {
  const withoutPunctuation = name.replace(/[:'\-.,]/g, '');
  return normalizeName(withoutPunctuation);
}

/**
 * Tokenizes a normalized string into an array of words.
 */
export function tokenize(normalizedName: string): string[] {
  return normalizedName.split(/\s+/).filter((word) => word.length > 0);
}

/**
 * Checks if all query words appear in the game name (in any order).
 * Each query word must appear as a substring of some word in the game name.
 */
function matchesWordOrder(queryTokens: string[], nameTokens: string[]): boolean {
  if (queryTokens.length === 0) return false;
  return queryTokens.every((queryWord) =>
    nameTokens.some((nameWord) => nameWord.includes(queryWord))
  );
}

export interface FuzzyMatchResult {
  matched: boolean;
  score: number;
}

/**
 * Determines if query matches game name using multi-strategy approach.
 * Strategies:
 * 1. Exact substring match (score: 100)
 * 2. Punctuation-normalized match (score: 80)
 * 3. Word-order independent match (score: 60)
 */
export function fuzzyMatch(query: string, gameName: string): FuzzyMatchResult {
  const normalizedQuery = normalizeName(query);
  const normalizedName = normalizeName(gameName);

  if (!normalizedQuery) {
    return { matched: false, score: 0 };
  }

  // Strategy 1: Exact substring match (score: 100)
  if (normalizedName.includes(normalizedQuery)) {
    return { matched: true, score: 100 };
  }

  // Strategy 2: Punctuation-normalized match (score: 80)
  const punctNormalizedQuery = normalizePunctuation(query);
  const punctNormalizedName = normalizePunctuation(gameName);

  if (punctNormalizedName.includes(punctNormalizedQuery)) {
    return { matched: true, score: 80 };
  }

  // Strategy 3: Word-order independent match (score: 60)
  const queryTokens = tokenize(punctNormalizedQuery);
  const nameTokens = tokenize(punctNormalizedName);

  if (queryTokens.length > 0 && matchesWordOrder(queryTokens, nameTokens)) {
    return { matched: true, score: 60 };
  }

  return { matched: false, score: 0 };
}
