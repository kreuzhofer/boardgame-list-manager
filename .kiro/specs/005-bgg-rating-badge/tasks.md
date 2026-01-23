# Implementation Plan: BGG Rating Badge

## Overview

This spec documents the already-implemented BGG Rating Badge feature. The tasks focus on adding proper test coverage for the existing implementation, including unit tests and property-based tests to validate the correctness properties defined in the design.

## Tasks

- [-] 1. Backend rating extraction tests
  - [-] 1.1 Write unit tests for CSV rating parsing in bggCache
    - Test that "average" column is extracted as rating
    - Test rounding to one decimal place
    - Test missing/invalid rating results in null
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ] 1.2 Write property test for rating extraction
    - **Property 1: Rating Extraction from CSV**
    - Generate random float values, verify rounding to one decimal
    - **Validates: Requirements 1.1, 1.2**

- [ ] 2. Backend search results tests
  - [ ] 2.1 Write unit tests for search results including rating
    - Test that search results include rating field
    - Test rating is correctly passed through from cache
    - _Requirements: 1.5_
  
  - [ ] 2.2 Write property test for search results rating inclusion
    - **Property 2: Search Results Include Rating**
    - Generate random cache data with ratings, verify all results include rating
    - **Validates: Requirements 1.5**

- [ ] 3. Checkpoint - Backend tests pass
  - Ensure all backend tests pass, ask the user if questions arise.

- [ ] 4. Frontend BggRatingBadge component tests
  - [ ] 4.1 Write unit tests for BggRatingBadge rendering
    - Test badge renders with correct rating text
    - Test hexagon SVG structure
    - Test white text styling
    - Test German tooltip text format
    - _Requirements: 3.3, 3.4, 3.5, 6.1_
  
  - [ ] 4.2 Write property test for rating display formatting
    - **Property 6: Rating Display Formatting**
    - Generate random ratings, verify one decimal place formatting
    - **Validates: Requirements 3.3**
  
  - [ ] 4.3 Write property test for rating color mapping
    - **Property 7: Rating Color Mapping**
    - Generate ratings 1-10, verify correct color for each range
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**

- [ ] 5. Frontend integration tests
  - [ ] 5.1 Write unit tests for GameCard badge rendering
    - Test badge renders when bggRating exists
    - Test badge does not render when bggRating is null
    - _Requirements: 3.1, 3.2, 5.1_
  
  - [ ] 5.2 Write unit tests for GameRow badge rendering
    - Test badge renders when bggRating exists
    - Test badge does not render when bggRating is null
    - _Requirements: 3.1, 3.2, 5.2_

- [ ] 6. Final checkpoint - All tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- This spec documents an already-implemented feature
- Focus is on test coverage for the existing implementation
- Property tests use fast-check with `{ numRuns: 10-20 }` for pure functions per workspace guidelines
