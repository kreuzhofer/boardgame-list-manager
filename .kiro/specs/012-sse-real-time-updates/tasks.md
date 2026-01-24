# Implementation Plan: SSE Real-Time Updates

## Overview

This implementation plan breaks down the SSE real-time updates feature into discrete coding tasks. The approach is:
1. Backend first: SSE infrastructure, then event broadcasting
2. Frontend second: SSE hook, toast system, then integration
3. Testing throughout to catch issues early

## Tasks

- [x] 1. Create SSE types and event payload definitions
  - [x] 1.1 Add SSE event types to backend types
    - Create `api/src/types/sse.ts` with GameEvent interface and event type union
    - Export from `api/src/types/index.ts`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 1.2 Add SSE event types to frontend types
    - Create `frontend/src/types/sse.ts` with SSEEvent types
    - Export from `frontend/src/types/index.ts`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 2. Implement backend SSE infrastructure
  - [x] 2.1 Create SSEManager service
    - Create `api/src/services/sse.service.ts`
    - Implement client connection management (addClient, removeClient)
    - Implement broadcast method to send events to all clients
    - Export singleton instance
    - _Requirements: 2.7_
  
  - [x] 2.2 Write unit tests for SSEManager
    - Test addClient and removeClient
    - Test broadcast to multiple clients
    - Test handling of disconnected clients during broadcast
    - _Requirements: 2.7_
  
  - [x] 2.3 Write property test for event payload structure
    - **Property 2: Event Payload Structure**
    - **Property 3: Event Payload Serialization Round-Trip**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**
  
  - [x] 2.4 Create SSE routes
    - Create `api/src/routes/sse.routes.ts`
    - Implement GET `/api/events` endpoint
    - Set proper SSE headers (Content-Type: text/event-stream, Cache-Control: no-cache)
    - Implement heartbeat every 30 seconds
    - Handle client disconnect cleanup
    - Register routes in `api/src/index.ts`
    - _Requirements: 1.1, 2.7_

- [x] 3. Checkpoint - Backend SSE infrastructure
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Integrate event broadcasting into GameService
  - [x] 4.1 Add getById method to game repository
    - Add `findById` method to `api/src/repositories/game.repository.ts` if not exists
    - _Requirements: 3.1, 3.2_
  
  - [x] 4.2 Update GameService to broadcast on game creation
    - Import sseManager in game.service.ts
    - Broadcast `game:created` event after successful createGame
    - Include gameId, userId, userName, gameName, isBringing in payload
    - _Requirements: 2.1_
  
  - [x] 4.3 Update GameService to broadcast on bringer actions
    - Broadcast `game:bringer-added` event after addBringer (with userName, gameName)
    - Broadcast `game:bringer-removed` event after removeBringer
    - _Requirements: 2.2, 2.3_
  
  - [x] 4.4 Update GameService to broadcast on player actions
    - Broadcast `game:player-added` event after addPlayer
    - Broadcast `game:player-removed` event after removePlayer
    - _Requirements: 2.4, 2.5_
  
  - [x] 4.5 Update GameService to broadcast on game deletion
    - Broadcast `game:deleted` event after deleteGame
    - _Requirements: 2.6_
  
  - [x] 4.6 Write property test for event broadcast correctness
    - **Property 1: Event Broadcast Correctness**
    - Test that each action type triggers correct event type
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

- [x] 5. Add getById endpoint to game routes
  - [x] 5.1 Create GET /api/games/:id endpoint
    - Add route handler in `api/src/routes/game.routes.ts`
    - Return single game by ID
    - Handle 404 for non-existent game
    - _Requirements: 3.1, 3.2_
  
  - [x] 5.2 Add getById method to frontend API client
    - Add `getById` method to gamesApi in `frontend/src/api/client.ts`
    - _Requirements: 3.1, 3.2_

- [x] 6. Checkpoint - Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement frontend toast system
  - [x] 7.1 Create toast message formatting utility
    - Create `frontend/src/utils/toastMessages.ts`
    - Implement `getToastMessage(event: SSEEvent): string | null`
    - Return German messages for game:created and game:bringer-added
    - Return null for other event types
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 7.2 Write property test for toast message formatting
    - **Property 4: Toast Message Formatting**
    - Test correct German format for all toast-triggering events
    - **Validates: Requirements 4.1, 4.2, 4.3**
  
  - [x] 7.3 Create ToastProvider and useToast hook
    - Create `frontend/src/components/ToastProvider.tsx`
    - Implement ToastContext with showToast function
    - Render toast container in bottom-right corner
    - Auto-dismiss toasts after 4 seconds
    - Stack multiple toasts vertically (newest at bottom)
    - _Requirements: 4.5, 4.6, 4.7_
  
  - [x] 7.4 Write unit tests for ToastProvider
    - Test toast display and auto-dismiss timing
    - Test multiple toast stacking order
    - _Requirements: 4.5, 4.7_
  
  - [x] 7.5 Write property test for toast ordering
    - **Property 6: Toast Ordering**
    - Test chronological ordering with newest at bottom
    - **Validates: Requirements 4.7**

- [x] 8. Implement useSSE hook
  - [x] 8.1 Create useSSE hook
    - Create `frontend/src/hooks/useSSE.ts`
    - Establish EventSource connection to `/api/events`
    - Parse incoming events and call appropriate handlers
    - Filter out events from current user for toasts
    - Implement exponential backoff reconnection (1s, 2s, 4s... max 30s)
    - Clean up connection on unmount
    - Export from `frontend/src/hooks/index.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.8, 6.1, 6.2_
  
  - [x] 8.2 Write unit tests for useSSE hook
    - Test connection establishment on mount
    - Test cleanup on unmount
    - Test event handler invocation
    - Test filtering of own user events for toasts
    - _Requirements: 1.1, 1.3, 4.8_
  
  - [x] 8.3 Write property test for toast filtering
    - **Property 5: Toast Filtering**
    - Test that toasts only shown for correct event types from other users
    - **Validates: Requirements 4.4, 4.8**
  
  - [x] 8.4 Write property test for reconnection backoff
    - **Property 7: Reconnection Backoff**
    - Test exponential backoff calculation: min(2^(N-1), 30) seconds
    - **Validates: Requirements 1.2**

- [x] 9. Integrate SSE into HomePage
  - [x] 9.1 Wrap App with ToastProvider
    - Update `frontend/src/App.tsx` to wrap with ToastProvider
    - _Requirements: 4.5, 4.6, 4.7_
  
  - [x] 9.2 Integrate useSSE hook in HomePage
    - Import and use useSSE hook in HomePage
    - Implement onGameCreated handler to fetch and add new game
    - Implement onGameUpdated handler to fetch and update specific game
    - Implement onGameDeleted handler to remove game from state
    - Connect toast display via useToast hook
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3_
  
  - [x] 9.3 Write integration tests for SSE in HomePage
    - Test that SSE events trigger correct state updates
    - Test that toasts appear for other users' actions
    - Test that own actions don't trigger toasts
    - _Requirements: 3.1, 3.2, 3.3, 4.8_

- [x] 10. Final checkpoint - Full integration
  - Ensure all tests pass, ask the user if questions arise.
  - Manually test real-time updates with multiple browser tabs

## Notes

- All tasks are required (comprehensive testing enabled)
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Backend uses Jest with `--runInBand`, frontend uses Vitest
