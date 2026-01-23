# Implementation Plan: Logout and Game Ownership

## Overview

This implementation adds logout functionality and game ownership management to the board game event application. The work is organized into database schema changes, API updates, and frontend modifications.

## Tasks

- [x] 1. Database schema changes for game ownership
  - [x] 1.1 Update Prisma schema to add ownerId field to Game model
    - Add `ownerId String? @map("owner_id")` field
    - Add `owner User? @relation(fields: [ownerId], references: [id], onDelete: SetNull)` relation
    - Add `@@index([ownerId])` for query performance
    - Add `ownedGames Game[]` relation to User model
    - _Requirements: 2.1, 4.3_
  - [x] 1.2 Create and run Prisma migration
    - Generate migration with `npx prisma migrate dev`
    - Verify migration sets existing games' ownerId to null
    - _Requirements: 2.1_

- [x] 2. Update API types and repository layer
  - [x] 2.1 Update TypeScript types for Game entity
    - Add `ownerId: string | null` to GameEntity
    - Add `owner: { id: string; name: string } | null` to Game API type
    - _Requirements: 2.1, 2.3_
  - [x] 2.2 Update game repository to include owner in queries
    - Modify `findAll` to include owner relation
    - Modify `findById` to include owner relation
    - Modify `create` to accept and set ownerId
    - _Requirements: 2.2, 2.3_

- [x] 3. Implement game deletion API endpoint
  - [x] 3.1 Add deleteGame method to game repository
    - Implement delete by ID
    - _Requirements: 3.5_
  - [x] 3.2 Add deleteGame method to game service
    - Validate game exists (404 if not)
    - Validate user is owner (403 if not)
    - Validate game has no players or bringers (400 if not empty)
    - Call repository delete method
    - _Requirements: 3.2, 3.5, 3.6, 3.7_
  - [x] 3.3 Add DELETE /api/games/:id route
    - Extract userId from x-user-id header
    - Call service deleteGame method
    - Return appropriate error responses
    - _Requirements: 3.5, 3.6, 3.7_
  - [x] 3.4 Write unit tests for game deletion service
    - Test successful deletion by owner of empty game
    - Test 403 when non-owner attempts deletion
    - Test 400 when game has players
    - Test 400 when game has bringers
    - Test 404 when game not found
    - _Requirements: 3.2, 3.5, 3.6, 3.7_
  - [x] 3.5 Write property test for game deletion authorization
    - **Property 2: Game Deletion Authorization and Validation**
    - **Validates: Requirements 3.2, 3.5, 3.6, 3.7**

- [x] 4. Checkpoint - Backend API complete
  - Ensure all backend tests pass
  - Run `cd api && npm test -- --runInBand`
  - Ask the user if questions arise

- [x] 5. Update game service to set owner on creation
  - [x] 5.1 Modify createGame to set ownerId
    - Pass userId as ownerId when creating game
    - _Requirements: 2.2_
  - [x] 5.2 Update game transformation to include owner
    - Transform owner relation to API format
    - Handle null owner case
    - _Requirements: 2.3, 2.4_
  - [x] 5.3 Write unit tests for game creation with owner
    - Test that created game has correct ownerId
    - Test that owner is included in API response
    - _Requirements: 2.2_
  - [x] 5.4 Write property test for game creation ownership
    - **Property 1: Game Creation Ownership**
    - **Validates: Requirements 2.2**

- [x] 6. Verify user deletion cascade behavior
  - [x] 6.1 Write property test for user deletion cascade
    - **Property 3: User Deletion Cascade Behavior**
    - Test that owned games have ownerId set to null after user deletion
    - Test that Player/Bringer records are deleted
    - **Validates: Requirements 4.1, 4.4**

- [x] 7. Checkpoint - Backend complete
  - Ensure all backend tests pass
  - Run `cd api && npm test -- --runInBand`
  - Ask the user if questions arise

- [x] 8. Update frontend API client
  - [x] 8.1 Add deleteGame method to gamesApi
    - Send DELETE request with x-user-id header
    - _Requirements: 3.5_
  - [x] 8.2 Update Game type to include owner
    - Add `owner: { id: string; name: string } | null` field
    - _Requirements: 2.3_

- [x] 9. Implement logout functionality in frontend
  - [x] 9.1 Add logout button to Header component
    - Add "Abmelden" button next to user info
    - Style consistently with existing header elements
    - _Requirements: 1.1_
  - [x] 9.2 Implement logout handler
    - Call clearUser() from useUser hook on click
    - This clears localStorage and triggers UserSelectionModal
    - _Requirements: 1.2, 1.3, 1.4_
  - [x] 9.3 Write unit tests for logout functionality
    - Test logout button is displayed when user is logged in
    - Test clearUser is called on logout click
    - _Requirements: 1.1, 1.2_

- [x] 10. Update game display components
  - [x] 10.1 Add owner display to GameRow component
    - Show owner name or "Kein Besitzer" if null
    - _Requirements: 2.3, 2.4_
  - [x] 10.2 Add owner display to GameCard component
    - Show owner name or "Kein Besitzer" if null
    - _Requirements: 2.3, 2.4_
  - [x] 10.3 Add delete button to GameRow component
    - Show only when currentUserId matches game.owner.id
    - Disable when game has players or bringers
    - Add tooltip explaining restriction when disabled
    - Hide for orphaned games (owner is null)
    - _Requirements: 3.1, 3.3, 3.8_
  - [x] 10.4 Add delete button to GameCard component
    - Same logic as GameRow
    - _Requirements: 3.1, 3.3, 3.8_
  - [x] 10.5 Write unit tests for owner display and delete button
    - Test owner name is displayed
    - Test "Kein Besitzer" for null owner
    - Test delete button visibility for owner vs non-owner
    - Test delete button disabled state
    - _Requirements: 2.3, 2.4, 3.1, 3.3, 3.8_

- [x] 11. Implement delete confirmation dialog
  - [x] 11.1 Create DeleteGameModal component
    - Use createPortal for proper modal rendering
    - Show confirmation message with game name
    - Include "Löschen" and "Abbrechen" buttons
    - _Requirements: 3.4_
  - [x] 11.2 Integrate delete flow in HomePage
    - Add state for delete modal
    - Handle delete confirmation
    - Call API and refresh game list on success
    - Show error toast on failure
    - _Requirements: 3.4, 3.5_
  - [x] 11.3 Write unit tests for delete confirmation
    - Test modal appears on delete button click
    - Test game is deleted on confirmation
    - Test modal closes on cancel
    - _Requirements: 3.4_

- [x] 12. Update GameTable to pass delete handler
  - [x] 12.1 Add onDeleteGame prop to GameTable
    - Pass through to GameRow and GameCard
    - _Requirements: 3.1_

- [x] 13. Final checkpoint - All tests pass
  - Run backend tests: `cd api && npm test -- --runInBand`
  - Run frontend tests: `cd frontend && npm test`
  - Rebuild containers: `docker compose up -d --build`
  - Ask the user if questions arise

## Notes

- All tasks are mandatory for comprehensive implementation
- Each task references specific requirements for traceability
- Property tests use `{ numRuns: 3 }` for DB operations per workspace guidelines
- German UI text used throughout (Requirement from existing codebase)
- Modals use createPortal per workspace modal-rendering guidelines
