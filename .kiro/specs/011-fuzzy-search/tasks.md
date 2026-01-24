# Implementation Plan: Fuzzy Search

## Overview

This implementation adds fuzzy/semantic search capabilities to the board game filtering system. The approach is incremental: first enhance normalization, then add matching strategies one by one, and finally integrate into existing filtering functions while maintaining backward compatibility.

## Tasks

- [x] 1. Enhance string normalization
  - [x] 1.1 Add `normalizePunctuation` function to `nameNormalization.ts`
    - Remove colons, hyphens, apostrophes, periods, commas from strings
    - Build on existing `normalizeName` function
    - _Requirements: 1.2_
  - [x] 1.2 Add `tokenize` function to `nameNormalization.ts`
    - Split normalized string into array of words
    - Filter out empty strings
    - _Requirements: 2.1_
  - [x] 1.3 Write property test for punctuation normalization
    - **Property 1: Punctuation Normalization Completeness**
    - **Validates: Requirements 1.2**
  - [x] 1.4 Write unit tests for normalization functions
    - Test specific examples: "Brass: Birmingham" → "brass birmingham"
    - Test edge cases: empty strings, only punctuation
    - _Requirements: 1.2, 1.3, 1.4_

- [x] 2. Implement fuzzy matching module
  - [x] 2.1 Create `fuzzyMatch.ts` with types and interfaces
    - Define `FuzzyMatchResult`, `FuzzyMatchConfig` interfaces
    - Export `DEFAULT_FUZZY_CONFIG` constant
    - _Requirements: 4.1_
  - [x] 2.2 Implement `editDistance` function
    - Use Levenshtein algorithm with early termination optimization
    - _Requirements: 3.1, 3.2_
  - [x] 2.3 Implement `fuzzyMatch` function with all strategies
    - Strategy 1: Exact substring match (score: 100)
    - Strategy 2: Punctuation-normalized match (score: 80)
    - Strategy 3: Word-order match (score: 60)
    - Strategy 4: Edit distance match (score: 40-59)
    - _Requirements: 1.1, 2.1, 3.1, 4.2, 4.3, 4.4_
  - [x] 2.4 Write property test for edit distance threshold
    - **Property 5: Edit Distance Threshold Behavior**
    - **Validates: Requirements 3.2, 3.4**
  - [x] 2.5 Write property test for score hierarchy
    - **Property 6: Score Hierarchy Invariant**
    - **Validates: Requirements 4.2, 4.3, 4.4**
  - [x] 2.6 Write unit tests for fuzzyMatch
    - Test "Brass Birmingham" matches "Brass: Birmingham"
    - Test "Birmingham Brass" matches "Brass: Birmingham"
    - Test "Cataan" matches "Catan"
    - _Requirements: 1.3, 1.4, 2.2, 3.1_

- [x] 3. Checkpoint - Verify matching logic
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Update game filtering module
  - [x] 4.1 Add `ScoredGame` interface and `filterGamesByNameWithScores` function
    - Return games with their match scores
    - Sort by score descending
    - _Requirements: 4.1, 4.5_
  - [x] 4.2 Update `filterGamesByName` to use fuzzy matching
    - Maintain existing function signature for backward compatibility
    - Use `filterGamesByNameWithScores` internally, return just games
    - _Requirements: 6.1, 6.3_
  - [x] 4.3 Update `shouldHighlightGame` to use fuzzy matching
    - Maintain existing function signature
    - _Requirements: 6.2_
  - [x] 4.4 Update remaining filtering functions
    - Update `getHighlightedGameIds`, `getMatchingGamesWithBringers`, `countMatchingGames`
    - _Requirements: 6.4_
  - [x] 4.5 Write property test for result ordering
    - **Property 7: Result Ordering**
    - **Validates: Requirements 4.5**
  - [x] 4.6 Write property test for empty query
    - **Property 8: Empty Query Identity**
    - **Validates: Requirements 5.3**
  - [x] 4.7 Write integration tests for game filtering
    - Test full filtering flow with various game lists
    - Verify backward compatibility with existing tests
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 5. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Backend BGG search fuzzy matching
  - [x] 6.1 Create `fuzzyMatch.ts` in `api/src/services/`
    - Implement `normalizeName`, `normalizePunctuation`, `tokenize` functions
    - Implement `fuzzyMatch` function (without edit-distance)
    - _Requirements: 7.1, 7.2_
  - [x] 6.2 Update `bggCache.ts` to use fuzzy matching
    - Replace simple `includes()` matching with `fuzzyMatch()`
    - Sort results by match score (best first), then by year (newest first)
    - _Requirements: 7.2, 7.3_
  - [x] 6.3 Update `filtering.ts` to use fuzzy matching for local game list
    - Update `filterByName` to use `fuzzyMatch` from frontend module
    - _Requirements: 6.1, 6.3_

## Notes

- Frontend implementation uses all four matching strategies including edit-distance
- Backend implementation excludes edit-distance to avoid false positives in large BGG database
- Property tests use `fast-check` with numRuns: 10-20 for pure functions
- Existing function signatures are preserved for backward compatibility
