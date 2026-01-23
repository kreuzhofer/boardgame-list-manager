# Implementation Plan: Unified Search and Add Game

## Overview

This implementation plan converts the design into discrete coding tasks. The approach is to build the core utility functions first, then the new components, and finally wire everything together in HomePage while removing the old components.

## Tasks

- [x] 1. Create utility functions for duplicate detection and name normalization
  - [x] 1.1 Create `frontend/src/utils/nameNormalization.ts` with `normalizeName` function
    - Convert to lowercase, trim, collapse multiple spaces
    - _Requirements: 5.6_
  - [x] 1.2 Write property test for name normalization idempotence
    - **Property 7: Name Normalization Idempotence**
    - **Validates: Requirements 5.6**
  - [x] 1.3 Create `frontend/src/utils/duplicateDetection.ts` with `checkDuplicate` function
    - Check bggId first, then normalized name
    - Return `DuplicateCheckResult` with `isDuplicate`, `matchedBy`, `existingGame`
    - _Requirements: 5.1, 5.2_
  - [x] 1.4 Write property test for duplicate detection priority
    - **Property 6: Duplicate Detection Priority**
    - **Validates: Requirements 5.1, 5.2**

- [x] 2. Create utility function for game filtering and highlighting
  - [x] 2.1 Create `frontend/src/utils/gameFiltering.ts` with `filterGamesByName` and `shouldHighlightGame` functions
    - Filter games whose normalized names include normalized query
    - Highlight function returns boolean based on name match
    - _Requirements: 1.2, 7.1_
  - [x] 2.2 Write property test for game list filtering
    - **Property 1: Game List Filtering**
    - **Validates: Requirements 1.2**
  - [x] 2.3 Write property test for game highlighting consistency
    - **Property 8: Game Highlighting Consistency**
    - **Validates: Requirements 7.1**

- [x] 3. Checkpoint - Ensure utility functions work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create UnifiedDropdown component
  - [x] 4.1 Create `frontend/src/components/UnifiedDropdown.tsx`
    - Dual-section dropdown with "In deiner Liste" and "Von BGG" sections
    - Max 3 items per section initially
    - "X weitere Treffer anzeigen..." link for BGG section
    - Progressive loading (expand by 5 on click)
    - Fixed height sections without scrolling
    - Touch-friendly tap targets (min 44px)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 9.3_
  - [x] 4.2 Write property test for In-Liste section item limit
    - **Property 2: In-Liste Section Item Limit**
    - **Validates: Requirements 2.3**
  - [x] 4.3 Write property test for BGG section initial item limit
    - **Property 3: BGG Section Initial Item Limit**
    - **Validates: Requirements 2.4**
  - [x] 4.4 Write property test for In-Liste item content
    - **Property 4: In-Liste Item Content**
    - **Validates: Requirements 3.1, 3.2**
  - [x] 4.5 Write property test for BGG item content
    - **Property 5: BGG Item Content**
    - **Validates: Requirements 4.5**

- [x] 5. Create UnifiedSearchBar component
  - [x] 5.1 Create `frontend/src/components/UnifiedSearchBar.tsx`
    - Single search input with placeholder "Spiel suchen oder hinzufügen..."
    - Integrate UnifiedDropdown
    - BGG indicator when item selected
    - Mitspielen/Mitbringen toggle buttons
    - Add button with proper state logic (hidden/enabled/disabled)
    - Duplicate message "Spiel bereits in der Liste"
    - Keyboard navigation (Arrow Up/Down, Enter, Escape)
    - Touch-friendly (min 44px height)
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 9.1, 10.1, 10.2, 10.3, 10.4_
  - [x] 5.2 Write property test for keyboard navigation cross-section
    - **Property 9: Keyboard Navigation Cross-Section**
    - **Validates: Requirements 10.5**
  - [x] 5.3 Write unit tests for add button state logic
    - Test empty input → hidden
    - Test BGG selected, not duplicate → enabled
    - Test BGG selected, is duplicate → disabled
    - Test custom name, not duplicate → enabled
    - Test custom name, matches existing → hidden
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 6. Create AdvancedFilters component
  - [x] 6.1 Create `frontend/src/components/AdvancedFilters.tsx`
    - Collapsible section with "Erweiterte Filter" header
    - Player search input
    - Bringer search input
    - Collapsed by default
    - Badge showing active filter count
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.7_
  - [x] 6.2 Write unit tests for AdvancedFilters
    - Test collapsed by default
    - Test expand/collapse toggle
    - Test active filter count badge
    - _Requirements: 8.4, 8.7_

- [x] 7. Checkpoint - Ensure new components work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Update GameRow and GameCard with highlight prop
  - [x] 8.1 Add `isHighlighted` prop to `frontend/src/components/GameRow.tsx`
    - Apply `bg-green-100` class when highlighted
    - _Requirements: 7.1, 7.2_
  - [x] 8.2 Add `isHighlighted` prop to `frontend/src/components/GameCard.tsx`
    - Apply `bg-green-100` class when highlighted
    - _Requirements: 7.1, 7.2_

- [x] 9. Update GameTable to pass highlight prop
  - [x] 9.1 Update `frontend/src/components/GameTable.tsx`
    - Accept `highlightedGameIds` prop (Set<string>)
    - Pass `isHighlighted` to GameRow and GameCard
    - _Requirements: 7.1, 7.2_

- [x] 10. Wire everything together in HomePage
  - [x] 10.1 Update `frontend/src/pages/HomePage.tsx`
    - Replace AddGameForm with UnifiedSearchBar
    - Replace SearchFilters name search with UnifiedSearchBar
    - Keep Wunsch and Meine Spiele toggles visible
    - Add AdvancedFilters component (collapsed)
    - Track search query for highlighting
    - Pass highlighted game IDs to GameTable
    - Handle scroll-to-game from dropdown
    - _Requirements: 1.1, 7.1, 7.3, 8.5, 8.6_
  - [x] 10.2 Write integration tests for full search flow
    - Type query → see dropdown → select BGG item → add game
    - Type query → click In_Liste item → verify scroll
    - _Requirements: 1.2, 3.3, 4.1_

- [x] 11. Clean up old components
  - [x] 11.1 Remove or deprecate `frontend/src/components/AddGameForm.tsx`
    - Component replaced by UnifiedSearchBar
  - [x] 11.2 Update `frontend/src/components/SearchFilters.tsx`
    - Remove name search (moved to UnifiedSearchBar)
    - Keep only as reference or remove if fully replaced

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive testing
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All UI text must be in German (existing requirement 9.1)
- Use fast-check for property-based tests with numRuns: 10-20 for pure functions
