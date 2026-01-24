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

/**
 * Normalizes a string by removing common punctuation marks.
 * Removes colons, hyphens, apostrophes, periods, and commas.
 * Also applies basic normalization (lowercase, trim, collapse spaces).
 * 
 * @param name - The string to normalize
 * @returns The normalized string with punctuation removed
 * 
 * @example
 * normalizePunctuation("Brass: Birmingham") // "brass birmingham"
 * normalizePunctuation("Catan: Seafarers") // "catan seafarers"
 * normalizePunctuation("Rock'n'Roll") // "rocknroll"
 * normalizePunctuation("A-B-C") // "abc"
 */
export function normalizePunctuation(name: string): string {
  // Remove colons, hyphens, apostrophes, periods, commas
  const withoutPunctuation = name.replace(/[:'\-.,]/g, '');
  return normalizeName(withoutPunctuation);
}


/**
 * Tokenizes a normalized string into an array of words.
 * Splits on whitespace and filters out empty strings.
 * 
 * @param normalizedName - A string (ideally already normalized)
 * @returns Array of words
 * 
 * @example
 * tokenize("brass birmingham") // ["brass", "birmingham"]
 * tokenize("catan") // ["catan"]
 * tokenize("") // []
 * tokenize("  multiple   spaces  ") // ["multiple", "spaces"]
 */
export function tokenize(normalizedName: string): string[] {
  return normalizedName.split(/\s+/).filter((word) => word.length > 0);
}
