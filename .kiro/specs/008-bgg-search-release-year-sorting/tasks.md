# Implementation Plan: BGG Search Release Year Sorting

## Overview

This implementation modifies the BGG cache sorting logic to sort games by release year descending (newest first) instead of by BGG rank. The change is localized to `api/src/services/bggCache.ts`.

## Tasks

- [x] 1. Modify BGG cache sorting logic
  - [x] 1.1 Update sort comparator in `initialize()` method
    - Change from `a.rank - b.rank` to year-descending with null handling
    - Null years should be placed after valid years
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 1.2 Update sort comparator in `loadGames()` method
    - Apply same sorting logic for test data loading
    - _Requirements: 1.1, 1.2_

- [x] 2. Update and add tests for sorting behavior
  - [x] 2.1 Update existing bggCache tests to expect year-descending order
    - Modify test expectations that assume rank-based ordering
    - _Requirements: 1.1, 2.1_
  
  - [x] 2.2 Write property test for year descending order
    - **Property 1: Year Descending Order**
    - **Validates: Requirements 1.1, 2.1**
  
  - [x] 2.3 Write property test for null years placement
    - **Property 2: Null Years Placed Last**
    - **Validates: Requirements 1.2, 3.1**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes
- The change is backward-compatible - API contract remains unchanged
- Only the order of results changes, not the data structure
