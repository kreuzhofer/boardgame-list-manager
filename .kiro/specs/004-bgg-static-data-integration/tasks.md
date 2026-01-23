# Implementation Plan: BGG Static Data Integration

## Overview

This plan implements BGG static data integration in phases: database schema, backend CSV loading and search API, then frontend autocomplete, Neuheit sticker, and BGG modal components.

## Tasks

- [x] 1. Database Schema Update
  - [x] 1.1 Add bggId and yearPublished fields to Game model in Prisma schema
    - Add `bggId Int? @map("bgg_id")` field
    - Add `yearPublished Int? @map("year_published")` field
    - Add index on bggId
    - _Requirements: 4.1, 4.2_
  - [x] 1.2 Generate and run Prisma migration
    - Run `npx prisma migrate dev --name add_bgg_fields`
    - _Requirements: 4.1, 4.2_

- [x] 2. Backend BGG Cache and Service
  - [x] 2.1 Create BggCache service to load and store CSV data
    - Create `api/src/services/bggCache.ts`
    - Implement CSV parsing using csv-parse library
    - Store games in memory array, exclude expansions (is_expansion=1)
    - Implement search method with case-insensitive matching, rank sorting, max 10 results
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.2, 2.3_
  - [x] 2.2 Write property test for expansion filtering
    - **Property 2: Expansion Filtering**
    - **Validates: Requirements 1.3**
  - [x] 2.3 Write property test for search ordering and limiting
    - **Property 4: Search Results Ordering and Limiting**
    - **Validates: Requirements 2.3**
  - [x] 2.4 Create BggService wrapper with query validation
    - Create `api/src/services/bggService.ts`
    - Return empty array for queries < 2 characters
    - _Requirements: 2.4_

- [x] 3. Backend BGG Search API Endpoint
  - [x] 3.1 Create BGG routes with GET /api/bgg/search endpoint
    - Create `api/src/routes/bgg.routes.ts`
    - Accept query parameter "q"
    - Return `{ results: BggSearchResult[] }`
    - _Requirements: 2.1, 2.5_
  - [x] 3.2 Register BGG routes and initialize cache at startup
    - Update `api/src/index.ts` to import and use bgg routes
    - Initialize BggCache with CSV path on startup
    - _Requirements: 1.1, 2.1_
  - [x] 3.3 Write unit tests for BGG search endpoint
    - Test empty query returns empty results
    - Test short query (<2 chars) returns empty results
    - Test valid query returns results with correct structure
    - _Requirements: 2.1, 2.4, 2.5_

- [x] 4. Update Game Creation API
  - [x] 4.1 Update game creation endpoint to accept bggId and yearPublished
    - Modify `api/src/routes/game.routes.ts` POST handler
    - Update CreateGameRequest type to include optional bggId and yearPublished
    - _Requirements: 4.3, 4.4_
  - [x] 4.2 Write unit tests for game creation with BGG data
    - Test game created with BGG data stores values
    - Test game created without BGG data stores null
    - _Requirements: 4.3, 4.4_

- [x] 5. Checkpoint - Backend Complete
  - Ensure all backend tests pass, ask the user if questions arise.

- [x] 6. Frontend Types and API Client
  - [x] 6.1 Update TypeScript types for BGG integration
    - Add BggSearchResult and BggSearchResponse types to `frontend/src/types/index.ts`
    - Update Game interface with bggId and yearPublished
    - Update CreateGameRequest with optional bggId and yearPublished
    - _Requirements: 2.5, 4.1, 4.2_
  - [x] 6.2 Add BGG API client methods
    - Add bggApi.search() method to `frontend/src/api/client.ts`
    - _Requirements: 2.1_

- [x] 7. Frontend Autocomplete Components
  - [x] 7.1 Create useBggSearch custom hook with debouncing
    - Create `frontend/src/hooks/useBggSearch.ts`
    - Implement 300ms debounce
    - Return results, isLoading, error state
    - _Requirements: 3.2_
  - [x] 7.2 Create AutocompleteDropdown component
    - Create `frontend/src/components/AutocompleteDropdown.tsx`
    - Display up to 5 results
    - Support keyboard navigation (arrow keys, Enter, Escape)
    - German placeholder text
    - _Requirements: 3.1, 3.3, 3.7, 3.8, 8.1_
  - [x] 7.3 Write property test for dropdown result limiting
    - **Property 7: Dropdown Result Limiting**
    - **Validates: Requirements 3.3**
  - [x] 7.4 Integrate autocomplete into AddGameForm
    - Update `frontend/src/components/AddGameForm.tsx`
    - Add state for selected BGG game (bggId, yearPublished)
    - Show dropdown after 1+ characters
    - Populate input and store BGG data on selection
    - Allow submission without selection (manual entry)
    - _Requirements: 3.1, 3.4, 3.5, 3.6_

- [x] 8. Frontend Neuheit Sticker Component
  - [x] 8.1 Create NeuheitSticker component
    - Create `frontend/src/components/NeuheitSticker.tsx`
    - Display "Neuheit {year}" with orange/gold background
    - Only render for current year or previous year
    - _Requirements: 5.1, 5.2, 5.3, 8.2_
  - [x] 8.2 Write property test for Neuheit display logic
    - **Property 10: Neuheit Sticker Display Logic**
    - **Validates: Requirements 5.1**
  - [x] 8.3 Integrate NeuheitSticker into GameCard
    - Update `frontend/src/components/GameCard.tsx`
    - Show sticker when yearPublished is current or previous year
    - _Requirements: 5.1, 5.4_

- [x] 9. Frontend BGG Modal Component
  - [x] 9.1 Create BggModal component with iframe
    - Create `frontend/src/components/BggModal.tsx`
    - Use createPortal to render into document.body
    - Full-screen overlay with header (game name, X button)
    - Iframe loads https://boardgamegeek.com/boardgame/{bggId}
    - Close on X click, Escape, backdrop click
    - German aria-label for close button
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.3_
  - [x] 9.2 Write property test for iframe URL format
    - **Property 13: BGG Modal Iframe URL**
    - **Validates: Requirements 7.3**
  - [x] 9.3 Add BGG button to GameCard
    - Update `frontend/src/components/GameCard.tsx`
    - Show green BGG button with info icon when bggId exists
    - Open BggModal on click
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 10. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks including tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Backend uses csv-parse library for CSV parsing
- Frontend uses fast-check for property-based tests
- All UI text is in German as per requirements
