# Implementation Plan: Alternate Names Search

## Overview

This implementation enhances the BGG search to use the database as the primary data source when complete, enables searching by alternate game names, stores alternate names with games for filtering and display, and improves the search dropdown UX. The work is organized into: data source detection, database loading with alternate name indexing, search enhancement, API updates, database schema extension, and frontend display.

## Tasks

- [x] 1. Enhance BggCache for data source detection
  - [x] 1.1 Add method to count non-expansion rows in CSV file
    - Add `countCsvRows(csvPath: string): Promise<number>` method
    - Parse CSV and count rows where `is_expansion !== '1'`
    - _Requirements: 1.1_
  - [x] 1.2 Add method to count non-expansion rows in database
    - Add `countDbRows(): Promise<number>` method
    - Query `SELECT COUNT(*) FROM bgg_games WHERE is_expansion = false`
    - _Requirements: 1.2_
  - [x] 1.3 Implement data source selection logic in initialize()
    - Compare CSV count vs DB count
    - Set `dataSource` property to 'csv' or 'database'
    - Log selected source and counts
    - _Requirements: 1.3, 1.4, 1.5_
  - [x] 1.4 Write property test for data source selection
    - **Property 1: Data Source Selection**
    - **Validates: Requirements 1.3, 1.4**

- [x] 2. Implement database loading with alternate names
  - [x] 2.1 Add types for alternate name handling
    - Add `BggGameWithAlternates` interface extending `BggGame`
    - Add `AlternateNameEntry` interface
    - _Requirements: 2.4_
  - [x] 2.2 Implement loadFromDatabase() method
    - Query all non-expansion BggGame records with enrichment_data
    - Extract alternate names from enrichment_data JSONB
    - Handle null/missing enrichment_data gracefully
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 2.3 Write property test for alternate name extraction
    - **Property 2: Alternate Name Extraction**
    - **Validates: Requirements 2.2**
  - [x] 2.4 Implement buildAlternateNameIndex() method
    - Create Map from normalized alternate names to game entries
    - Store original (non-normalized) name alongside normalized
    - _Requirements: 2.4, 2.5_
  - [x] 2.5 Write property test for alternate name normalization
    - **Property 4: Alternate Name Normalization**
    - **Validates: Requirements 2.5**

- [x] 3. Checkpoint - Verify data loading
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Enhance search to include alternate names
  - [x] 4.1 Update search() method signature and return type
    - Return `BggSearchResultWithAlt[]` with `matchedAlternateName` and `alternateNames` fields
    - _Requirements: 4.3, 4.5_
  - [x] 4.2 Implement alternate name matching in search
    - Apply fuzzy matching to alternate names
    - Collect matches with scores and matched alternate name
    - _Requirements: 3.1, 3.4_
  - [x] 4.3 Implement result merging and deduplication
    - Primary matches get +10 score bonus
    - Deduplicate by game ID, preferring primary matches
    - Keep best-scoring alternate when multiple match
    - Include all alternateNames in each result
    - _Requirements: 3.2, 3.3, 3.5, 4.4_
  - [x] 4.4 Write property test for alternate name search inclusion
    - **Property 5: Alternate Name Search Inclusion**
    - **Validates: Requirements 3.1**
  - [x] 4.5 Write property test for primary name priority
    - **Property 6: Primary Name Match Priority**
    - **Validates: Requirements 3.3, 4.4**
  - [x] 4.6 Write property test for result annotation
    - **Property 8: Result Annotation Correctness**
    - **Validates: Requirements 4.1, 4.2, 5.4**
  - [x] 4.7 Write property test for all alternate names included
    - **Property 9: All Alternate Names Included**
    - **Validates: Requirements 4.5, 5.2**

- [x] 5. Update BggService and API response
  - [x] 5.1 Update BggService searchGames() return type
    - Include `matchedAlternateName` and `alternateNames` in response
    - _Requirements: 4.1, 4.2, 4.5_
  - [x] 5.2 Update API route response format
    - Ensure backward compatibility (existing fields unchanged)
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 5.3 Write unit tests for API response format
    - Test response includes matchedAlternateName and alternateNames fields
    - Test backward compatibility
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 6. Checkpoint - Verify search backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Extend Game table schema
  - [x] 7.1 Create database migration
    - Add `added_as_alternate_name` VARCHAR(255) NULL column
    - Add `alternate_names` JSONB NOT NULL DEFAULT '[]' column
    - _Requirements: 8.1, 8.2_
  - [x] 7.2 Update Prisma schema
    - Add `addedAsAlternateName` and `alternateNames` fields to Game model
    - _Requirements: 8.1, 8.2_
  - [x] 7.3 Update game service to handle alternate name fields
    - Accept `addedAsAlternateName` and `alternateNames` in create/update
    - Return alternate name fields in responses
    - _Requirements: 8.3, 8.4, 8.5_
  - [x] 7.4 Write unit tests for game service alternate name handling
    - Test creating game with alternate name data
    - Test creating game without alternate name data
    - _Requirements: 8.3, 8.4, 8.5_

- [x] 8. Update add game API endpoint
  - [x] 8.1 Update add game request validation
    - Accept optional `addedAsAlternateName` string
    - Accept optional `alternateNames` string array
    - _Requirements: 9.1, 9.2_
  - [x] 8.2 Update add game handler to store alternate names
    - Store `addedAsAlternateName` when provided
    - Store `alternateNames` array when provided
    - _Requirements: 9.3_
  - [x] 8.3 Write property test for alternate names persistence
    - **Property 10: Alternate Names Persistence**
    - **Validates: Requirements 9.1, 9.3**

- [x] 9. Checkpoint - Verify database changes complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Update frontend types
  - [x] 10.1 Update BggSearchResult type
    - Add `matchedAlternateName?: string | null` field
    - Add `alternateNames?: string[]` field
    - _Requirements: 5.1, 5.2_
  - [x] 10.2 Update Game type
    - Add `addedAsAlternateName: string | null` field
    - Add `alternateNames: string[]` field
    - _Requirements: 8.1, 8.2_

- [x] 11. Update AutocompleteDropdown
  - [x] 11.1 Add alternate name display below primary name
    - Show "Auch bekannt als: {alternateName}" in smaller, muted text
    - Only display when matchedAlternateName is present
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [x] 11.2 Implement height limiting with scroll
    - Set max-height to fit mobile viewport (e.g., `min(400px, 60vh)`)
    - Enable overflow-y-auto for scrolling
    - _Requirements: 7.1, 7.2, 7.5_
  - [x] 11.3 Add fade gradient indicator for scrollable content
    - Add bottom fade gradient when content is scrollable
    - Match style from UserSelectionModal
    - _Requirements: 7.3, 7.4_
  - [x] 11.4 Write unit tests for AutocompleteDropdown enhancements
    - Test alternate name renders when present
    - Test no alternate name section when null
    - Test dropdown has max-height constraint
    - _Requirements: 6.1, 6.3, 6.4, 7.1, 7.2_

- [x] 12. Update add game flow in frontend
  - [x] 12.1 Pass alternate name data when adding game
    - Include `addedAsAlternateName` from selected result's `matchedAlternateName`
    - Include `alternateNames` from selected result
    - _Requirements: 9.1, 9.2_
  - [x] 12.2 Write unit tests for add game flow
    - Test alternate name data passed to API
    - Test handling when no alternate name matched
    - _Requirements: 9.1, 9.2_

- [x] 13. Checkpoint - Verify add game flow complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Update game list filtering
  - [x] 14.1 Enhance filtering to search alternate names
    - Update filterGamesBySearch to check alternateNames array
    - Use same fuzzy matching as BGG search
    - Case-insensitive matching
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [x] 14.2 Write property test for game list filtering
    - **Property 11: Game List Filter Includes Alternate Names**
    - **Validates: Requirements 10.1**
  - [x] 14.3 Write unit tests for filtering
    - Test filter finds game by primary name
    - Test filter finds game by alternate name
    - Test filter excludes non-matching games
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 15. Update game list display
  - [x] 15.1 Update GameCard (mobile) to show alternate name inline
    - Display format: "Primary · Alternate"
    - Truncate if combined text too long
    - Only show when addedAsAlternateName is set
    - _Requirements: 11.1, 11.3, 11.4, 11.5_
  - [x] 15.2 Update GameRow (desktop) to show alternate name on second line
    - Display alternate name below primary in smaller, muted text
    - Only show when addedAsAlternateName is set
    - _Requirements: 11.1, 11.2, 11.5_
  - [x] 15.3 Write unit tests for game list display
    - Test GameCard shows inline format with alternate name
    - Test GameRow shows two-line format with alternate name
    - Test both components show only primary when no alternate
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks including tests are required for comprehensive coverage
- The implementation uses TypeScript throughout (matching existing codebase)
- Property tests use `fast-check` library with `{ numRuns: 5 }` for DB operations, `{ numRuns: 10 }` for pure functions
- Database loading only occurs when DB has >= CSV row count (graceful fallback)
- Alternate names are copied to Game table at add time (no joins needed for filtering)
- Mobile display uses inline format to minimize height impact
- Dropdown height is limited to prevent extending beyond mobile viewport

