# Implementation Plan: Board Game Event Coordination Application

## Overview

This implementation plan breaks down the board game event coordination application into discrete coding tasks. The application uses React/TypeScript/Tailwind for frontend, Express.js for backend, and PostgreSQL for database, all containerized with Docker Compose.

## Tasks

- [ ] 1. Project Setup and Infrastructure
  - [ ] 1.1 Initialize project structure with frontend and api directories
    - Create `frontend/` directory with Vite + React + TypeScript + Tailwind
    - Create `api/` directory with Express.js + TypeScript
    - Configure TypeScript for both projects
    - _Requirements: 10.1, 10.2_
  
  - [ ] 1.2 Set up Docker Compose configuration
    - Create `docker-compose.yml` with frontend, api, and postgresql services
    - Create Dockerfiles for frontend and api
    - Configure environment variables for password, event name, and database
    - _Requirements: 10.4, 10.5, 10.6_
  
  - [ ] 1.3 Set up PostgreSQL database schema
    - Create `api/db/init.sql` with games, players, and bringers tables
    - Add indexes for performance
    - Configure database connection in api
    - _Requirements: 10.3_

- [ ] 2. Backend Core - Authentication and Database Layer
  - [ ] 2.1 Implement database connection and repository layer
    - Create database connection pool with pg library
    - Implement GameRepository with CRUD operations
    - _Requirements: 10.3_
  
  - [ ] 2.2 Implement AuthService for password verification
    - Create AuthService that compares input against EVENT_PASSWORD env var
    - Implement POST /api/auth/verify endpoint
    - _Requirements: 1.2, 1.3_
  
  - [ ] 2.3 Write unit tests for AuthService
    - Test correct password returns success
    - Test incorrect password returns failure
    - _Requirements: 1.2, 1.3_

- [ ] 3. Backend Core - Game Management Service
  - [ ] 3.1 Implement GameService core methods
    - Implement getAllGames() with players and bringers
    - Implement createGame() with optional bringer flag
    - Implement addPlayer() and removePlayer()
    - Implement addBringer() and removeBringer()
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_
  
  - [ ] 3.2 Implement game API endpoints
    - GET /api/games - list all games
    - POST /api/games - create new game
    - POST /api/games/:id/players - add player
    - DELETE /api/games/:id/players/:userName - remove player
    - POST /api/games/:id/bringers - add bringer
    - DELETE /api/games/:id/bringers/:userName - remove bringer
    - _Requirements: 3.1, 3.5, 3.6_
  
  - [ ] 3.3 Write property test for game creation with bringer flag
    - **Property 3: Game Creation with Bringer Flag**
    - **Validates: Requirements 3.3**
  
  - [ ] 3.4 Write property test for game creation without bringer flag
    - **Property 4: Game Creation without Bringer Flag**
    - **Validates: Requirements 3.4**
  
  - [ ] 3.5 Write property test for add player invariant
    - **Property 5: Add Player Invariant**
    - **Validates: Requirements 3.5**
  
  - [ ] 3.6 Write property test for add bringer invariant
    - **Property 6: Add Bringer Invariant**
    - **Validates: Requirements 3.6**

- [ ] 4. Backend - Statistics Service
  - [ ] 4.1 Implement StatisticsService
    - Calculate total games count
    - Calculate unique participants count
    - Calculate available vs requested games
    - Calculate popular games ranking
    - Implement GET /api/statistics endpoint
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ] 4.2 Write property test for statistics calculations
    - **Property 16: Statistics - Total Games Count**
    - **Property 17: Statistics - Unique Participants Count**
    - **Property 18: Statistics - Available vs Requested Partition**
    - **Property 19: Statistics - Popular Games Ranking**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**

- [ ] 5. Checkpoint - Backend API Complete
  - Ensure all backend tests pass with `cd api && npm test -- --runInBand`
  - Verify API endpoints work with manual testing
  - Ask the user if questions arise

- [ ] 6. Frontend Core - Authentication Flow
  - [ ] 6.1 Set up React project structure and routing
    - Configure React Router for navigation
    - Set up Tailwind CSS
    - Create base layout components
    - _Requirements: 10.1_
  
  - [ ] 6.2 Implement AuthGuard and PasswordScreen components
    - Create AuthGuard wrapper that checks session auth
    - Create PasswordScreen with German UI text
    - Store auth state in sessionStorage
    - Use createPortal for any modal dialogs
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 9.1_
  
  - [ ] 6.3 Implement NamePrompt and user name management
    - Create NamePrompt component for first-time users
    - Store/retrieve name from localStorage
    - Display current user name in Header
    - Allow name change option
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ] 6.4 Write property test for name persistence round-trip
    - **Property 2: Name Persistence Round-Trip**
    - **Validates: Requirements 2.2, 2.3**

- [ ] 7. Frontend - Game List Display
  - [ ] 7.1 Implement GameTable and GameRow components
    - Display games in table format with Name, Mitspieler, Bringt mit columns
    - Show players and bringers separately per game
    - Display game status badge (Wunsch/Verfügbar)
    - Show "Wird gesucht!" badge for Wunsch games
    - Show duplicate bringer hint when 3+ bringers
    - _Requirements: 3.9, 4.1, 4.2, 4.3, 4.6, 5.1_
  
  - [ ] 7.2 Implement game status derivation logic
    - Create utility function to derive status from bringers count
    - Apply visual highlighting for Wunsch games
    - _Requirements: 4.1, 4.2_
  
  - [ ] 7.3 Write property test for game status derivation
    - **Property 9: Game Status Derivation**
    - **Validates: Requirements 4.1, 4.2**

- [ ] 8. Frontend - Game Actions
  - [ ] 8.1 Implement AddGameForm component
    - Form with game name input and "Bringe ich mit" checkbox
    - German labels and validation messages
    - _Requirements: 3.1, 3.2, 9.1_
  
  - [ ] 8.2 Implement GameActions component
    - "Möchte ich spielen" button to add as player
    - "Bringe ich mit" button to add as bringer
    - "Wunsch erfüllen" quick action for Wunsch games
    - Remove buttons for current user's entries
    - _Requirements: 3.5, 3.6, 4.4, 4.5_

- [ ] 9. Frontend - Sorting and Filtering
  - [ ] 9.1 Implement sorting functionality
    - Default alphabetical sort by game name
    - Toggle ascending/descending order
    - _Requirements: 5.2, 5.3_
  
  - [ ] 9.2 Implement SearchFilters component
    - Search box for game name column
    - Search box for Mitspieler column
    - Search box for Bringt mit column
    - "Gesuchte Spiele" filter toggle
    - "Meine Spiele" filter toggle
    - _Requirements: 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_
  
  - [ ] 9.3 Write property tests for filtering logic
    - **Property 11: Alphabetical Sort Order**
    - **Property 12: Search Filter Correctness**
    - **Property 13: Wunsch Filter Correctness**
    - **Property 14: My Games Filter Correctness**
    - **Validates: Requirements 5.2, 5.3, 5.7, 5.8, 5.9**

- [ ] 10. Frontend - Statistics Dashboard
  - [ ] 10.1 Implement Statistics component
    - Display total games count
    - Display total participants count
    - Display available vs requested games
    - Display most popular games list
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 11. Frontend - Print Functionality
  - [ ] 11.1 Implement PrintList component
    - Generate printable list of games user is bringing
    - Format for table labels with user name
    - Print-friendly CSS styling
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 11.2 Write property test for print list content
    - **Property 15: Print List Contains User's Games**
    - **Validates: Requirements 7.2**

- [ ] 12. Frontend - Responsive Design
  - [ ] 12.1 Implement responsive layouts
    - Desktop-optimized table layout
    - Mobile-optimized card/list layout
    - Responsive navigation and header
    - Touch-friendly interactions on mobile
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 13. Checkpoint - Frontend Complete
  - Ensure all frontend tests pass with `cd frontend && npm test`
  - Verify responsive design on desktop and mobile viewports
  - Ask the user if questions arise

- [ ] 14. Integration and Final Testing
  - [ ] 14.1 Wire frontend to backend API
    - Configure API client with base URL from environment
    - Implement error handling for API calls
    - Add loading states and error messages in German
    - _Requirements: 9.1_
  
  - [ ] 14.2 End-to-end integration verification
    - Verify Docker Compose starts all services
    - Test complete user flow: auth → name → add game → view list
    - Verify environment variables are properly loaded
    - _Requirements: 9.3, 10.4_

- [ ] 15. Final Checkpoint
  - Run full test suite for both api and frontend
  - Verify application works in Docker Compose environment
  - Ask the user if questions arise

## Notes

- All UI text must be in German (Requirement 9.1)
- Use `docker compose` (V2 syntax), not `docker-compose`
- Use `createPortal` for modal dialogs per workspace guidelines
- Property tests should use `{ numRuns: 3-5 }` for DB operations, `{ numRuns: 10-20 }` for pure functions
- Backend tests: `cd api && npm test -- --runInBand`
- Frontend tests: `cd frontend && npm test`
