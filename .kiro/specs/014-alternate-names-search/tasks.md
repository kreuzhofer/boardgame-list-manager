# Implementation Plan: Alternate Names Search

## Overview

This implementation enhances the BGG search to use the database as the primary data source when complete, and enables searching by alternate game names. The work is organized into: data source detection, database loading with alternate name indexing, search enhancement, API updates, and frontend display.

## Tasks

- [ ] 1. Enhance BggCache for data source detection
  - [ ] 1.1 Add method to count non-expansion rows in CSV file
    - Add `countCsvRows(csvPath: string): Promise<number>` method
    - Parse CSV and count rows where `is_expansion !== '1'`
    - _Requirements: 1.1_
  - [ ] 1.2 Add method to count non-expansion rows in database
    - Add `countDbRows(): Promise<number>` method
    - Query `SELECT COUNT(*) FROM bgg_games WHERE is_expansion = false`
    - _Requirements: 1.2_
  - [ ] 1.3 Implement data source selection logic in initialize()
    - Compare CSV count vs DB count
    - Set `dataSource` property to 'csv' or 'database'
    - Log selected source and counts
    - _Requirements: 1.3, 1.4, 1.5_
  - [ ] 1.4 Write property test for data source selection
    - **Property 1: Data Source Selection**
    - **Validates: Requirements 1.3, 1.4**

- [ ] 2. Implement database loading with alternate names
  - [ ] 2.1 Add types for alternate name handling
    - Add `BggGameWithAlternates` interface extending `BggGame`
    - Add `AlternateNameEntry` interface
    - _Requirements: 2.4_
  - [ ] 2.2 Implement loadFromDatabase() method
    - Query all non-expansion BggGame records with enrichment_data
    - Extract alternate names from enrichment_data JSONB
    - Handle null/missing enrichment_data gracefully
    - _Requirements: 2.1, 2.2, 2.3_
  - [ ] 2.3 Write property test for alternate name extraction
    - **Property 2: Alternate Name Extraction**
    - **Validates: Requirements 2.2**
  - [ ] 2.4 Implement buildAlternateNameIndex() method
    - Create Map from normalized alternate names to game entries
    - Store original (non-normalized) name alongside normalized
    - _Requirements: 2.4, 2.5_
  - [ ] 2.5 Write property test for alternate name normalization
    - **Property 4: Alternate Name Normalization**
    - **Validates: Requirements 2.5**

- [ ] 3. Checkpoint - Verify data loading
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Enhance search to include alternate names
  - [ ] 4.1 Update search() method signature and return type
    - Return `BggSearchResultWithAlt[]` with `matchedAlternateName` field
    - _Requirements: 4.3_
  - [ ] 4.2 Implement alternate name matching in search
    - Apply fuzzy matching to alternate names
    - Collect matches with scores and matched alternate name
    - _Requirements: 3.1, 3.4_
  - [ ] 4.3 Implement result merging and deduplication
    - Primary matches get +10 score bonus
    - Deduplicate by game ID, preferring primary matches
    - Keep best-scoring alternate when multiple match
    - _Requirements: 3.2, 3.3, 3.5, 4.4_
  - [ ] 4.4 Write property test for alternate name search inclusion
    - **Property 5: Alternate Name Search Inclusion**
    - **Validates: Requirements 3.1**
  - [ ] 4.5 Write property test for primary name priority
    - **Property 6: Primary Name Match Priority**
    - **Validates: Requirements 3.3, 4.4**
  - [ ] 4.6 Write property test for result annotation
    - **Property 8: Result Annotation Correctness**
    - **Validates: Requirements 4.1, 4.2, 5.3**

- [ ] 5. Update BggService and API response
  - [ ] 5.1 Update BggService searchGames() return type
    - Include `matchedAlternateName` in response
    - _Requirements: 4.1, 4.2_
  - [ ] 5.2 Update API route response format
    - Ensure backward compatibility (existing fields unchanged)
    - _Requirements: 5.1, 5.2_
  - [ ] 5.3 Write unit tests for API response format
    - Test response includes matchedAlternateName field
    - Test backward compatibility
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 6. Checkpoint - Verify backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Update frontend types and display
  - [ ] 7.1 Update BggSearchResult type
    - Add optional `matchedAlternateName?: string | null` field
    - _Requirements: 5.1_
  - [ ] 7.2 Update AutocompleteDropdown to display alternate names
    - Show matched alternate name below primary name in smaller text
    - Only display when matchedAlternateName is present
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [ ] 7.3 Write unit tests for AutocompleteDropdown alternate name display
    - Test alternate name renders when present
    - Test no alternate name section when null
    - _Requirements: 6.1, 6.3, 6.4_

- [ ] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks including tests are required for comprehensive coverage
- The implementation uses TypeScript throughout (matching existing codebase)
- Property tests use `fast-check` library with `{ numRuns: 5 }` for DB operations
- Database loading only occurs when DB has >= CSV row count (graceful fallback)
