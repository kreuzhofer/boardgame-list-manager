# Requirements Document

## Introduction

This feature enhances the board game search functionality to be more forgiving of user input variations. Currently, the search uses exact substring matching which fails when users omit punctuation (like colons in "Brass: Birmingham"), use different word orders, or make minor typos. The fuzzy search will improve the user experience by finding games even when the search query doesn't exactly match the game name.

## Glossary

- **Search_Query**: The text string entered by the user in the search input field
- **Game_Name**: The name of a board game as stored in the system
- **Fuzzy_Matcher**: The component responsible for determining if a search query matches a game name with tolerance for variations
- **Match_Score**: A numeric value indicating how well a search query matches a game name (higher is better)
- **Normalized_String**: A string that has been processed to remove case differences, extra whitespace, and punctuation
- **Edit_Distance**: The minimum number of single-character edits (insertions, deletions, substitutions) needed to transform one string into another

## Requirements

### Requirement 1: Punctuation-Tolerant Matching

**User Story:** As a user, I want to find games without typing exact punctuation, so that I can quickly find games like "Brass: Birmingham" by typing "Brass Birmingham".

#### Acceptance Criteria

1. WHEN a user searches for a game name without punctuation, THE Fuzzy_Matcher SHALL match games that contain the same words with punctuation (colons, hyphens, apostrophes)
2. WHEN normalizing strings for comparison, THE Fuzzy_Matcher SHALL remove colons, hyphens, apostrophes, and other common punctuation marks
3. WHEN a user searches "Brass Birmingham", THE Fuzzy_Matcher SHALL return "Brass: Birmingham" as a match
4. WHEN a user searches "Catan Seafarers", THE Fuzzy_Matcher SHALL return "Catan: Seafarers" as a match

### Requirement 2: Word Order Tolerance

**User Story:** As a user, I want to find games regardless of word order, so that I can find "Brass: Birmingham" by typing "Birmingham Brass".

#### Acceptance Criteria

1. WHEN a user enters a multi-word search query, THE Fuzzy_Matcher SHALL match games containing all query words in any order
2. WHEN searching "Birmingham Brass", THE Fuzzy_Matcher SHALL return "Brass: Birmingham" as a match
3. WHEN searching with partial words, THE Fuzzy_Matcher SHALL match if all partial words appear in the game name
4. WHEN a query word does not appear in the game name, THE Fuzzy_Matcher SHALL not return that game as a word-order match

### Requirement 3: Typo Tolerance

**User Story:** As a user, I want to find games even when I make minor spelling mistakes, so that I can find "Catan" by typing "Cataan" or "Katan".

#### Acceptance Criteria

1. WHEN a user enters a search query with minor typos, THE Fuzzy_Matcher SHALL return games with similar names based on edit distance
2. WHEN the edit distance between the normalized query and normalized game name is within a configurable threshold, THE Fuzzy_Matcher SHALL consider it a match
3. THE Fuzzy_Matcher SHALL use a maximum edit distance threshold proportional to the query length (e.g., 1 for short queries, 2 for longer queries)
4. WHEN a query has too many differences from any game name, THE Fuzzy_Matcher SHALL not return false positive matches

### Requirement 4: Match Ranking

**User Story:** As a user, I want the most relevant search results to appear first, so that exact matches and close matches are prioritized over fuzzy matches.

#### Acceptance Criteria

1. THE Fuzzy_Matcher SHALL assign a Match_Score to each matching game
2. WHEN a game name exactly contains the search query as a substring, THE Fuzzy_Matcher SHALL assign the highest Match_Score
3. WHEN a game matches via punctuation-normalized comparison, THE Fuzzy_Matcher SHALL assign a higher Match_Score than word-order matches
4. WHEN a game matches via word-order matching, THE Fuzzy_Matcher SHALL assign a higher Match_Score than typo-tolerant matches
5. WHEN returning search results, THE Fuzzy_Matcher SHALL sort games by Match_Score in descending order

### Requirement 5: Performance

**User Story:** As a user, I want search results to appear instantly as I type, so that the search feels responsive.

#### Acceptance Criteria

1. THE Fuzzy_Matcher SHALL complete filtering of up to 500 games within 50 milliseconds
2. THE Fuzzy_Matcher SHALL use efficient algorithms that avoid unnecessary string operations
3. WHEN the search query is empty, THE Fuzzy_Matcher SHALL return all games without performing fuzzy matching operations

### Requirement 6: Backward Compatibility

**User Story:** As a user, I want existing exact searches to continue working, so that my current search habits are not disrupted.

#### Acceptance Criteria

1. THE Fuzzy_Matcher SHALL maintain compatibility with the existing `filterGamesByName` function signature
2. THE Fuzzy_Matcher SHALL maintain compatibility with the existing `shouldHighlightGame` function signature
3. WHEN a search query exactly matches a substring of a game name, THE Fuzzy_Matcher SHALL always include that game in results
4. THE Fuzzy_Matcher SHALL not break any existing functionality that depends on game filtering

### Requirement 7: BGG Search Integration

**User Story:** As a user, I want the BGG game search to also use fuzzy matching, so that I can find games in the BGG database using the same flexible search patterns.

#### Acceptance Criteria

1. WHEN searching the BGG database, THE backend Fuzzy_Matcher SHALL apply the same matching strategies as the frontend (punctuation-tolerant, word-order tolerant)
2. WHEN a user searches "brass bir" in the BGG search, THE backend SHALL return "Brass: Birmingham" as a match
3. THE backend Fuzzy_Matcher SHALL rank results by match quality (exact > punctuation > word-order)
4. THE backend Fuzzy_Matcher SHALL NOT include edit-distance matching to avoid excessive false positives in the large BGG database
