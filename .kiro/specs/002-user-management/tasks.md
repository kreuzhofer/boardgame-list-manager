# Implementation Plan: User Management

## Overview

This plan implements the User table feature for the board game event application. The implementation follows a bottom-up approach: database schema first, then backend services, then frontend integration. This is a breaking change that drops existing data.

## Tasks

- [x] 1. Database Schema Migration
  - [x] 1.1 Create Prisma migration for User table and updated Player/Bringer schemas
    - Add User model with id, name, createdAt, updatedAt
    - Update Player model: replace userName with userId foreign key
    - Update Bringer model: replace userName with userId foreign key
    - Add cascade delete constraints
    - Run `npx prisma migrate dev --name add-user-table`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 8.1-8.6_

- [x] 2. Backend User Management
  - [x] 2.1 Create User repository (`api/src/repositories/user.repository.ts`)
    - Implement findAll(), findById(), findByName(), create(), update(), delete()
    - Export singleton instance
    - _Requirements: 3.1, 3.2, 3.4, 3.7, 3.10_

  - [x] 2.2 Create User service (`api/src/services/user.service.ts`)
    - Implement getAllUsers(), getUserById(), createUser(), updateUser(), deleteUser()
    - Add validation for empty/whitespace names
    - Handle duplicate name errors with German messages
    - Transform entities to API response format
    - _Requirements: 3.1-3.10_

  - [x] 2.3 Create User routes (`api/src/routes/user.routes.ts`)
    - GET /api/users - list all users
    - GET /api/users/:id - get user by ID
    - POST /api/users - create user
    - PATCH /api/users/:id - update user name
    - DELETE /api/users/:id - delete user
    - Wire routes in api/src/index.ts
    - _Requirements: 3.1-3.10_

  - [x] 2.4 Write unit tests for User repository
    - Test CRUD operations
    - Test duplicate name constraint
    - Test cascade delete behavior
    - _Requirements: 2.3, 2.4, 2.5_

  - [x] 2.5 Write unit tests for User service
    - Test validation logic
    - Test error handling
    - _Requirements: 3.5, 3.6, 3.8, 3.9_

  - [x] 2.6 Write property test for whitespace name rejection
    - **Property 2: Whitespace-Only Names Are Rejected**
    - **Validates: Requirements 1.2, 3.5, 3.8**

- [x] 3. Update Backend Game Service
  - [x] 3.1 Update Game repository to use userId
    - Modify create() to accept userId instead of userName
    - Modify addPlayer() to accept userId
    - Modify addBringer() to accept userId
    - Modify removePlayer() to use userId
    - Modify removeBringer() to use userId
    - Include user relation in queries
    - _Requirements: 4.1-4.5_

  - [x] 3.2 Update Game service to use userId
    - Update createGame() signature and implementation
    - Update addPlayer(), removePlayer() to use userId
    - Update addBringer(), removeBringer() to use userId
    - Transform responses to include user objects
    - _Requirements: 4.1-4.6_

  - [x] 3.3 Update Game routes to use userId
    - Update POST /api/games to accept userId
    - Update POST /api/games/:id/players to accept userId
    - Update DELETE /api/games/:id/players/:userId path parameter
    - Update POST /api/games/:id/bringers to accept userId
    - Update DELETE /api/games/:id/bringers/:userId path parameter
    - _Requirements: 4.1-4.5_

  - [x] 3.4 Write property test for game response user objects
    - **Property 4: Game Responses Include Complete User Objects**
    - **Validates: Requirements 4.6**

- [x] 4. Update Backend Types
  - [x] 4.1 Update API types (`api/src/types/index.ts`)
    - Add UserEntity interface
    - Update PlayerEntity and BringerEntity to use userId and include user relation
    - Add User API response type
    - Update Player and Bringer API types to include user object
    - Update CreateGameDto, CreatePlayerDto, CreateBringerDto to use userId
    - _Requirements: 4.6_

- [x] 5. Checkpoint - Backend Complete
  - Ensure all backend tests pass
  - Verify API endpoints work with curl/Postman
  - Ask the user if questions arise

- [x] 6. Frontend Type Updates
  - [x] 6.1 Update frontend types (`frontend/src/types/index.ts`)
    - Add User interface
    - Update Player and Bringer to include user object instead of name
    - Update CreateGameRequest to use userId
    - Update AddPlayerRequest and AddBringerRequest to use userId
    - Add CreateUserRequest and UpdateUserRequest
    - Add UsersResponse and UserResponse types
    - _Requirements: 4.6, 6.1, 6.2_

- [x] 7. Frontend API Client Updates
  - [x] 7.1 Update API client (`frontend/src/api/client.ts`)
    - Add usersApi with getAll(), getById(), create(), update(), delete()
    - Update gamesApi.create() to use userId
    - Update gamesApi.addPlayer() to use userId
    - Update gamesApi.removePlayer() to use userId in path
    - Update gamesApi.addBringer() to use userId
    - Update gamesApi.removeBringer() to use userId in path
    - _Requirements: 3.1-3.10, 4.1-4.5_

- [x] 8. Frontend User Hook
  - [x] 8.1 Create useUser hook (`frontend/src/hooks/useUser.ts`)
    - Store userId in localStorage (key: 'boardgame_event_user_id')
    - Fetch user data from API on mount
    - Handle invalid/deleted user (clear storage, return null)
    - Provide setUser(), clearUser(), refreshUser() functions
    - _Requirements: 5.4, 5.5, 5.6_

  - [x] 8.2 Update hooks index to export useUser
    - Remove or deprecate useUserName hook
    - _Requirements: 5.4_

  - [x] 8.3 Write unit tests for useUser hook
    - Test localStorage persistence
    - Test API validation
    - Test error handling
    - _Requirements: 5.4, 5.5, 5.6_

- [x] 9. Frontend User Selection Modal
  - [x] 9.1 Create UserSelectionModal component (`frontend/src/components/UserSelectionModal.tsx`)
    - Fetch and display list of existing users
    - Allow selecting an existing user
    - Provide form to create new user
    - Validate name input (non-empty)
    - Show error messages in German
    - Use createPortal for modal rendering
    - _Requirements: 5.1, 5.2, 5.3, 7.4_

  - [x] 9.2 Write unit tests for UserSelectionModal
    - Test user list rendering
    - Test user selection
    - Test new user creation
    - Test validation errors
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 10. Frontend User Name Editor
  - [x] 10.1 Create UserNameEditor component (`frontend/src/components/UserNameEditor.tsx`)
    - Display current user name with edit button
    - Inline edit or modal for name change
    - Call PATCH /api/users/:id on submit
    - Show success/error feedback in German
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 10.2 Write unit tests for UserNameEditor
    - Test edit mode toggle
    - Test API call on submit
    - Test error handling
    - _Requirements: 7.2, 7.3, 7.4_

- [x] 11. Checkpoint - User Components Complete
  - Ensure user-related component tests pass
  - Ask the user if questions arise

- [x] 12. Update Existing Frontend Components
  - [x] 12.1 Update App.tsx to use useUser and show UserSelectionModal
    - Replace useUserName with useUser
    - Show UserSelectionModal when user is null
    - Pass user to child components
    - _Requirements: 5.1, 5.5, 5.6_

  - [x] 12.2 Update Header component to show user name and edit option
    - Display current user name from user object
    - Add UserNameEditor or link to edit name
    - _Requirements: 6.3, 7.1_

  - [x] 12.3 Update HomePage to use userId for game operations
    - Use user.id instead of userName for API calls
    - Update handleAddPlayer, handleRemovePlayer
    - Update handleAddBringer, handleRemoveBringer
    - _Requirements: 4.1-4.5_

  - [x] 12.4 Update GameTable and GameRow to display user names
    - Access player.user.name instead of player.name
    - Access bringer.user.name instead of bringer.name
    - _Requirements: 6.1, 6.2_

  - [x] 12.5 Update GameCard component for mobile view
    - Access player.user.name and bringer.user.name
    - _Requirements: 6.1, 6.2_

  - [x] 12.6 Update AddGameForm to use userId
    - Pass userId instead of userName when creating game
    - _Requirements: 4.1_

  - [x] 12.7 Update SearchFilters and filtering logic
    - Update player/bringer search to use user.name
    - Update useGameFilters hook if needed
    - _Requirements: 6.1, 6.2_

  - [x] 12.8 Update PrintList and PrintPage components
    - Access user names from user objects
    - _Requirements: 6.1, 6.2_

  - [x] 12.9 Update Statistics component if it references user names
    - Ensure any user name displays use user.name
    - _Requirements: 6.1, 6.2_

- [x] 13. Final Checkpoint
  - Run all backend tests: `cd api && npm test -- --runInBand`
  - Run all frontend tests: `cd frontend && npm test`
  - Rebuild Docker containers: `docker compose up -d --build`
  - Manually verify user selection flow works
  - Verify game operations work with new user system
  - Ask the user if questions arise

## Notes

- This is a breaking change - all existing data will be dropped
- All error messages are in German per existing application convention
- Property tests use `{ numRuns: 3-5 }` for DB operations per project guidelines
- Frontend modals use `createPortal` per project steering guidelines
