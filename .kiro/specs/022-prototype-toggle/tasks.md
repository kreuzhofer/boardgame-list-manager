# Implementation Plan: Prototype Toggle

## Overview

This plan implements the prototype toggle feature in incremental steps, starting with the API layer, then SSE events, and finally the frontend UI components. Each task builds on previous work and includes testing sub-tasks.

## Tasks

- [x] 1. Extend API layer with prototype toggle endpoint
  - [x] 1.1 Add `updatePrototype` method to GameRepository
    - Add method to `api/src/repositories/game.repository.ts`
    - Update game's `isPrototype` field and return updated entity
    - _Requirements: 1.1_
  
  - [x] 1.2 Add `togglePrototype` method to GameService
    - Add method to `api/src/services/game.service.ts`
    - Validate ownership (throw 403 if not owner)
    - Validate no BGG ID (throw 400 if has BGG ID)
    - Call repository to update and return transformed game
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 1.3 Add PATCH `/api/games/:id/prototype` route
    - Add route to `api/src/routes/game.routes.ts`
    - Accept `{ isPrototype: boolean }` in request body
    - Use `x-user-id` header for user identification
    - Return updated game or appropriate error response
    - _Requirements: 1.1, 1.2, 1.3, 1.5_
  
  - [x] 1.4 Write unit tests for prototype toggle API
    - Test successful toggle returns updated game
    - Test 403 when non-owner attempts toggle
    - Test 400 when game has BGG ID
    - Test 404 when game doesn't exist
    - _Requirements: 1.1, 1.2, 1.3, 1.5_
  
  - [x] 1.5 Write property test for prototype toggle round-trip
    - **Property 1: Prototype Toggle Round-Trip**
    - **Validates: Requirements 1.1**

- [x] 2. Add SSE event for prototype toggle
  - [x] 2.1 Extend SSE types with `game:prototype-toggled` event
    - Update `api/src/types/sse.ts` with new event type
    - Update `frontend/src/types/sse.ts` with matching types
    - _Requirements: 1.4, 4.1_
  
  - [x] 2.2 Broadcast SSE event on successful toggle
    - Update GameService.togglePrototype to broadcast event
    - Include gameId, userId, and isPrototype in event payload
    - _Requirements: 1.4_
  
  - [x] 2.3 Write unit test for SSE event broadcast
    - Verify event is broadcast with correct payload
    - _Requirements: 1.4_

- [x] 3. Checkpoint - Ensure API tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Add frontend API client function
  - [x] 4.1 Add `togglePrototype` function to games API
    - Add function to `frontend/src/api/games.ts`
    - Send PATCH request with isPrototype and x-user-id header
    - Return updated game from response
    - _Requirements: 1.1_

- [x] 5. Create PrototypeToggle component
  - [x] 5.1 Create PrototypeToggle component
    - Create `frontend/src/components/PrototypeToggle.tsx`
    - Implement toggle switch with loading state
    - Accept gameId, isPrototype, onToggle, and disabled props
    - Style consistently with existing action buttons
    - _Requirements: 2.3, 3.2_
  
  - [x] 5.2 Write unit tests for PrototypeToggle component
    - Test toggle calls onToggle with correct parameters
    - Test disabled state prevents interaction
    - _Requirements: 2.3, 3.2_

- [x] 6. Create MobileActionsMenu component
  - [x] 6.1 Create MobileActionsMenu component
    - Create `frontend/src/components/MobileActionsMenu.tsx`
    - Implement "..." button that opens dropdown menu
    - Include PrototypeToggle in menu
    - Use createPortal for proper z-index handling
    - _Requirements: 2.1, 2.2_
  
  - [x] 6.2 Write unit tests for MobileActionsMenu component
    - Test menu opens on button click
    - Test menu contains prototype toggle
    - _Requirements: 2.1, 2.2_

- [x] 7. Integrate prototype toggle into GameCard (mobile)
  - [x] 7.1 Update GameCard to show MobileActionsMenu
    - Add `onTogglePrototype` prop to GameCard
    - Conditionally render MobileActionsMenu when owner AND no BGG ID
    - Handle API errors with toast notification
    - _Requirements: 2.1, 2.3, 2.5, 2.6_
  
  - [x] 7.2 Write property test for mobile actions menu visibility
    - **Property 2: Mobile Actions Menu Visibility**
    - **Validates: Requirements 2.1, 2.6**

- [x] 8. Integrate prototype toggle into GameRow (desktop)
  - [x] 8.1 Update GameRow to show PrototypeToggle
    - Add `onTogglePrototype` prop to GameRow
    - Conditionally render PrototypeToggle when owner AND no BGG ID
    - Position after all other action buttons
    - Handle API errors with toast notification
    - _Requirements: 3.1, 3.2, 3.4, 3.5_
  
  - [x] 8.2 Write property test for desktop toggle visibility
    - **Property 3: Desktop Prototype Toggle Visibility**
    - **Validates: Requirements 3.1, 3.5**

- [x] 9. Handle SSE events in frontend
  - [x] 9.1 Update SSE event handler to process prototype-toggled events
    - Update game list state when event received
    - Update affected game's isPrototype field
    - _Requirements: 4.1, 4.2_
  
  - [x] 9.2 Write unit test for SSE event handling
    - Test game state updates on prototype-toggled event
    - _Requirements: 4.1, 4.2_

- [x] 10. Wire up prototype toggle in parent components
  - [x] 10.1 Add togglePrototype handler to GameTable/GameList
    - Create handler function that calls API
    - Pass handler to GameCard and GameRow components
    - Handle optimistic updates and error rollback
    - _Requirements: 2.3, 3.2_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks including tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All UI text should be in German to match existing application
