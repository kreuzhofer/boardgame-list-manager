# Design Document: Board Game Event Coordination Application

## Overview

This document describes the technical design for a board game event coordination application. The application enables participants of private board game events to coordinate which games will be available by maintaining a shared list where users can indicate games they want to play or will bring. The system emphasizes pre-event coordination to prevent duplicate game copies and help fulfill game requests.

The application follows a three-tier architecture with a React frontend, Express.js API backend, and PostgreSQL database (accessed via Prisma ORM), all containerized via Docker Compose.

## Architecture

```mermaid
graph TB
    subgraph "Docker Compose Environment"
        subgraph "Frontend Container"
            React[React + TypeScript + Tailwind]
        end
        
        subgraph "API Container"
            Express[Express.js API]
            Prisma[Prisma ORM]
        end
        
        subgraph "Database Container"
            PostgreSQL[(PostgreSQL)]
        end
    end
    
    Browser[Browser] --> React
    React --> Express
    Express --> Prisma
    Prisma --> PostgreSQL
    
    subgraph "Browser Storage"
        LocalStorage[localStorage]
        SessionStorage[sessionStorage]
    end
    
    Browser --> LocalStorage
    Browser --> SessionStorage
```

### System Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant Frontend
    participant API
    participant Database
    
    User->>Frontend: Visit application
    Frontend->>Browser: Check session auth
    alt Not authenticated
        Frontend->>User: Show password screen
        User->>Frontend: Enter password
        Frontend->>API: POST /api/auth/verify
        API->>Frontend: Auth result
        Frontend->>Browser: Store auth in session
    end
    
    Frontend->>Browser: Check localStorage for name
    alt No stored name
        Frontend->>User: Prompt for name
        User->>Frontend: Enter name
        Frontend->>Browser: Store name in localStorage
    end
    
    Frontend->>API: GET /api/games
    API->>Database: Query games with players/bringers
    Database->>API: Return game data
    API->>Frontend: Return game list
    Frontend->>User: Display game list
```

## Components and Interfaces

### Frontend Components

```mermaid
graph TB
    App[App]
    App --> AuthGuard[AuthGuard]
    AuthGuard --> PasswordScreen[PasswordScreen]
    AuthGuard --> NamePrompt[NamePrompt]
    AuthGuard --> MainLayout[MainLayout]
    
    MainLayout --> Header[Header]
    MainLayout --> GameList[GameList]
    MainLayout --> Statistics[Statistics]
    
    Header --> UserInfo[UserInfo]
    Header --> EventTitle[EventTitle]
    
    GameList --> SearchFilters[SearchFilters]
    GameList --> SortControls[SortControls]
    GameList --> GameTable[GameTable]
    GameList --> AddGameForm[AddGameForm]
    
    GameTable --> GameRow[GameRow]
    GameRow --> PlayerList[PlayerList]
    GameRow --> BringerList[BringerList]
    GameRow --> GameActions[GameActions]
    
    Statistics --> StatCard[StatCard]
    Statistics --> PopularGames[PopularGames]
```

### Component Interfaces

```typescript
// Authentication
interface AuthGuardProps {
  children: React.ReactNode;
}

interface PasswordScreenProps {
  onAuthenticated: () => void;
}

interface NamePromptProps {
  onNameSubmitted: (name: string) => void;
}

// Game List
interface Game {
  id: string;
  name: string;
  players: Player[];
  bringers: Bringer[];
  status: 'wunsch' | 'verfuegbar';
  createdAt: Date;
}

interface Player {
  id: string;
  name: string;
  addedAt: Date;
}

interface Bringer {
  id: string;
  name: string;
  addedAt: Date;
}

interface GameListProps {
  currentUser: string;
}

interface GameRowProps {
  game: Game;
  currentUser: string;
  onAddPlayer: (gameId: string) => void;
  onAddBringer: (gameId: string) => void;
  onRemovePlayer: (gameId: string) => void;
  onRemoveBringer: (gameId: string) => void;
}

interface AddGameFormProps {
  currentUser: string;
  onGameAdded: (game: Game) => void;
}

// Filters and Search
interface SearchFiltersProps {
  onNameSearch: (query: string) => void;
  onPlayerSearch: (query: string) => void;
  onBringerSearch: (query: string) => void;
  onWunschFilter: (enabled: boolean) => void;
  onMyGamesFilter: (enabled: boolean) => void;
}

interface SortControlsProps {
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (order: 'asc' | 'desc') => void;
}

// Statistics
interface StatisticsData {
  totalGames: number;
  totalParticipants: number;
  availableGames: number;
  requestedGames: number;
  popularGames: PopularGame[];
}

interface PopularGame {
  id: string;
  name: string;
  playerCount: number;
}

// Print
interface PrintListProps {
  userName: string;
  games: Game[];
}
```

### API Endpoints

```typescript
// Authentication
POST /api/auth/verify
  Request: { password: string }
  Response: { success: boolean, message?: string }

// Games
GET /api/games
  Response: { games: Game[] }

POST /api/games
  Request: { name: string, userName: string, isBringing: boolean }
  Response: { game: Game }

POST /api/games/:id/players
  Request: { userName: string }
  Response: { game: Game }

DELETE /api/games/:id/players/:userName
  Response: { game: Game }

POST /api/games/:id/bringers
  Request: { userName: string }
  Response: { game: Game }

DELETE /api/games/:id/bringers/:userName
  Response: { game: Game }

// Statistics
GET /api/statistics
  Response: StatisticsData
```

### Backend Services

```typescript
// AuthService
interface AuthService {
  verifyPassword(password: string): boolean;
}

// GameService
interface GameService {
  getAllGames(): Promise<Game[]>;
  createGame(name: string, userName: string, isBringing: boolean): Promise<Game>;
  addPlayer(gameId: string, userName: string): Promise<Game>;
  removePlayer(gameId: string, userName: string): Promise<Game>;
  addBringer(gameId: string, userName: string): Promise<Game>;
  removeBringer(gameId: string, userName: string): Promise<Game>;
  getStatistics(): Promise<StatisticsData>;
}

// GameRepository
interface GameRepository {
  findAll(): Promise<GameEntity[]>;
  findById(id: string): Promise<GameEntity | null>;
  create(game: CreateGameDto): Promise<GameEntity>;
  addPlayer(gameId: string, player: CreatePlayerDto): Promise<GameEntity>;
  removePlayer(gameId: string, userName: string): Promise<GameEntity>;
  addBringer(gameId: string, bringer: CreateBringerDto): Promise<GameEntity>;
  removeBringer(gameId: string, userName: string): Promise<GameEntity>;
}
```

## Data Models

### Database Schema

```mermaid
erDiagram
    games {
        uuid id PK
        varchar name UK
        timestamp created_at
        timestamp updated_at
    }
    
    players {
        uuid id PK
        uuid game_id FK
        varchar user_name
        timestamp added_at
    }
    
    bringers {
        uuid id PK
        uuid game_id FK
        varchar user_name
        timestamp added_at
    }
    
    games ||--o{ players : has
    games ||--o{ bringers : has
```

### SQL Schema

The database schema is managed by Prisma. The following shows the equivalent SQL that Prisma generates:

```sql
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(game_id, user_name)
);

CREATE TABLE bringers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(game_id, user_name)
);

CREATE INDEX idx_players_game_id ON players(game_id);
CREATE INDEX idx_bringers_game_id ON bringers(game_id);
CREATE INDEX idx_players_user_name ON players(user_name);
CREATE INDEX idx_bringers_user_name ON bringers(user_name);
```

### Prisma Schema

```prisma
// api/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Game {
  id        String   @id @default(uuid())
  name      String   @unique
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  players   Player[]
  bringers  Bringer[]

  @@map("games")
}

model Player {
  id       String   @id @default(uuid())
  gameId   String   @map("game_id")
  userName String   @map("user_name")
  addedAt  DateTime @default(now()) @map("added_at")
  game     Game     @relation(fields: [gameId], references: [id], onDelete: Cascade)

  @@unique([gameId, userName])
  @@index([gameId])
  @@index([userName])
  @@map("players")
}

model Bringer {
  id       String   @id @default(uuid())
  gameId   String   @map("game_id")
  userName String   @map("user_name")
  addedAt  DateTime @default(now()) @map("added_at")
  game     Game     @relation(fields: [gameId], references: [id], onDelete: Cascade)

  @@unique([gameId, userName])
  @@index([gameId])
  @@index([userName])
  @@map("bringers")
}
```

### TypeScript Entity Types

```typescript
interface GameEntity {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  players: PlayerEntity[];
  bringers: BringerEntity[];
}

interface PlayerEntity {
  id: string;
  gameId: string;
  userName: string;
  addedAt: Date;
}

interface BringerEntity {
  id: string;
  gameId: string;
  userName: string;
  addedAt: Date;
}

// DTOs
interface CreateGameDto {
  name: string;
  userName: string;
  isBringing: boolean;
}

interface CreatePlayerDto {
  userName: string;
}

interface CreateBringerDto {
  userName: string;
}
```

### Environment Variables

```typescript
interface EnvironmentConfig {
  // Database
  DATABASE_URL: string;
  
  // Authentication
  EVENT_PASSWORD: string;
  
  // Event Configuration
  EVENT_NAME: string;
  
  // Server
  API_PORT: number;
  FRONTEND_PORT: number;
  
  // CORS
  CORS_ORIGIN: string;
}
```

### Docker Compose Configuration

```yaml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "${FRONTEND_PORT:-3000}:80"
    environment:
      - VITE_API_URL=http://localhost:${API_PORT:-3001}
      - VITE_EVENT_NAME=${EVENT_NAME}
    depends_on:
      - api

  api:
    build: ./api
    ports:
      - "${API_PORT:-3001}:3001"
    environment:
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@postgresql:5432/${DB_NAME}
      - EVENT_PASSWORD=${EVENT_PASSWORD}
      - EVENT_NAME=${EVENT_NAME}
      - CORS_ORIGIN=http://localhost:${FRONTEND_PORT:-3000}
    depends_on:
      postgresql:
        condition: service_healthy

  postgresql:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

Note: Database schema is managed by Prisma migrations. The API container runs `prisma migrate deploy` on startup.


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Password Verification

*For any* password input, the authentication service SHALL return success if and only if the input matches the configured event password.

**Validates: Requirements 1.2, 1.3**

### Property 2: Name Persistence Round-Trip

*For any* valid user name string, storing it in localStorage and then retrieving it SHALL return the exact same string.

**Validates: Requirements 2.2, 2.3**

### Property 3: Game Creation with Bringer Flag

*For any* valid game name and user name, when creating a game with the "Bringe ich mit" flag enabled, the resulting game SHALL have the user in both the players list and the bringers list.

**Validates: Requirements 3.3**

### Property 4: Game Creation without Bringer Flag

*For any* valid game name and user name, when creating a game without the "Bringe ich mit" flag, the resulting game SHALL have the user only in the players list and NOT in the bringers list.

**Validates: Requirements 3.4**

### Property 5: Add Player Invariant

*For any* existing game and valid user name, adding the user as a player SHALL result in the game's players list containing that user, and the bringers list SHALL remain unchanged.

**Validates: Requirements 3.5**

### Property 6: Add Bringer Invariant

*For any* existing game and valid user name, adding the user as a bringer SHALL result in the game's bringers list containing that user, and the players list SHALL remain unchanged.

**Validates: Requirements 3.6**

### Property 7: Multiple Bringers Allowed

*For any* game and any sequence of distinct user names, adding each user as a bringer SHALL result in all users being present in the bringers list.

**Validates: Requirements 3.7**

### Property 8: Unlimited Players Allowed

*For any* game and any sequence of distinct user names, adding each user as a player SHALL result in all users being present in the players list.

**Validates: Requirements 3.8**

### Property 9: Game Status Derivation

*For any* game, the status SHALL be "Wunsch" if and only if the game has at least one player AND zero bringers; otherwise the status SHALL be "Verfügbar" if the game has at least one bringer.

**Validates: Requirements 4.1, 4.2**

### Property 10: Duplicate Bringer Hint Threshold

*For any* game with N bringers where N >= 3, the system SHALL indicate that the game is already being brought by N people.

**Validates: Requirements 4.6**

### Property 11: Alphabetical Sort Order

*For any* list of games, the default sort order SHALL be alphabetically ascending by game name, and toggling SHALL reverse to descending order.

**Validates: Requirements 5.2, 5.3**

### Property 12: Search Filter Correctness

*For any* search query string and game list, filtering by name/player/bringer SHALL return only games where the respective field contains the query string (case-insensitive).

**Validates: Requirements 5.7**

### Property 13: Wunsch Filter Correctness

*For any* game list, applying the "Gesuchte Spiele" filter SHALL return only games with zero bringers.

**Validates: Requirements 5.8**

### Property 14: My Games Filter Correctness

*For any* game list and current user, applying the "Meine Spiele" filter SHALL return only games where the current user is either a player or a bringer.

**Validates: Requirements 5.9**

### Property 15: Print List Contains User's Games

*For any* user and game list, the print output SHALL contain exactly the games where the user is listed as a bringer.

**Validates: Requirements 7.2**

### Property 16: Statistics - Total Games Count

*For any* game list, the total games statistic SHALL equal the number of games in the list.

**Validates: Requirements 8.1**

### Property 17: Statistics - Unique Participants Count

*For any* game list, the unique participants count SHALL equal the count of distinct user names across all players and bringers lists.

**Validates: Requirements 8.2**

### Property 18: Statistics - Available vs Requested Partition

*For any* game list, the sum of available games count and requested games count SHALL equal the total games count, where available games have at least one bringer and requested games have zero bringers.

**Validates: Requirements 8.3**

### Property 19: Statistics - Popular Games Ranking

*For any* game list, the popular games ranking SHALL be ordered by player count in descending order.

**Validates: Requirements 8.4**

## Error Handling

### Authentication Errors

| Error Scenario | Response | User Feedback |
|----------------|----------|---------------|
| Incorrect password | 401 Unauthorized | "Falsches Passwort. Bitte erneut versuchen." |
| Missing password | 400 Bad Request | "Bitte Passwort eingeben." |
| Session expired | Redirect to login | Automatic redirect to password screen |

### Game Management Errors

| Error Scenario | Response | User Feedback |
|----------------|----------|---------------|
| Duplicate game name | 409 Conflict | "Ein Spiel mit diesem Namen existiert bereits." |
| Empty game name | 400 Bad Request | "Bitte einen Spielnamen eingeben." |
| Game not found | 404 Not Found | "Spiel nicht gefunden." |
| User already player | 409 Conflict | "Du bist bereits als Mitspieler eingetragen." |
| User already bringer | 409 Conflict | "Du bringst dieses Spiel bereits mit." |
| User not in list | 404 Not Found | "Du bist nicht in dieser Liste eingetragen." |

### Database Errors

| Error Scenario | Response | Recovery |
|----------------|----------|----------|
| Connection failure | 503 Service Unavailable | Retry with exponential backoff |
| Query timeout | 504 Gateway Timeout | Log error, return user-friendly message |
| Constraint violation | 409 Conflict | Return specific error message |

### Client-Side Errors

| Error Scenario | Handling |
|----------------|----------|
| localStorage unavailable | Fall back to session-only storage with warning |
| Network failure | Show offline indicator, queue actions for retry |
| Invalid response format | Log error, show generic error message |

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Example
{
  "error": {
    "code": "DUPLICATE_GAME",
    "message": "Ein Spiel mit diesem Namen existiert bereits.",
    "details": {
      "existingGameId": "uuid-here"
    }
  }
}
```

## Testing Strategy

### Overview

The testing strategy employs a dual approach combining unit tests for specific examples and edge cases with property-based tests for universal correctness properties. This ensures comprehensive coverage while maintaining test efficiency.

### Testing Framework Selection

- **Backend (Express.js)**: Jest with `fast-check` for property-based testing
- **Frontend (React)**: Vitest with React Testing Library and `fast-check`
- **Database**: Jest with Prisma test client and database isolation

### Unit Testing Approach

Unit tests focus on:
- Specific examples demonstrating correct behavior
- Edge cases (empty inputs, boundary values)
- Error conditions and exception handling
- Integration points between components

**Unit Test Examples:**
- Authentication with correct/incorrect password
- Adding a game with empty name (validation)
- Removing a player who doesn't exist (error handling)
- Statistics with empty game list (edge case)

### Property-Based Testing Approach

Property tests verify universal correctness properties using `fast-check`. Each property test:
- Runs minimum 100 iterations with random inputs
- References the design document property it validates
- Uses appropriate generators for domain types

**Property Test Configuration:**
```typescript
import * as fc from 'fast-check';

// Custom arbitraries
const gameNameArbitrary = fc.string({ minLength: 1, maxLength: 255 })
  .filter(s => s.trim().length > 0);

const userNameArbitrary = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0);

const gameArbitrary = fc.record({
  id: fc.uuid(),
  name: gameNameArbitrary,
  players: fc.array(fc.record({
    id: fc.uuid(),
    name: userNameArbitrary,
    addedAt: fc.date()
  })),
  bringers: fc.array(fc.record({
    id: fc.uuid(),
    name: userNameArbitrary,
    addedAt: fc.date()
  }))
});
```

**Property Test Tagging Format:**
```typescript
// Feature: board-game-event, Property 9: Game Status Derivation
describe('Game Status Derivation', () => {
  it('should derive status based on bringers presence', () => {
    fc.assert(
      fc.property(gameArbitrary, (game) => {
        const status = deriveGameStatus(game);
        if (game.bringers.length === 0 && game.players.length > 0) {
          return status === 'wunsch';
        }
        if (game.bringers.length > 0) {
          return status === 'verfuegbar';
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
```

### Test Organization

```
api/
├── src/
│   ├── services/
│   │   └── __tests__/
│   │       ├── auth.service.test.ts
│   │       ├── game.service.test.ts
│   │       └── game.service.property.test.ts
│   └── repositories/
│       └── __tests__/
│           └── game.repository.test.ts
└── jest.config.js

frontend/
├── src/
│   ├── components/
│   │   └── __tests__/
│   │       ├── GameList.test.tsx
│   │       └── SearchFilters.test.tsx
│   ├── hooks/
│   │   └── __tests__/
│   │       └── useGameFilters.property.test.ts
│   └── utils/
│       └── __tests__/
│           ├── sorting.test.ts
│           └── statistics.property.test.ts
└── vitest.config.ts
```

### Test Database Strategy

- Use separate test database for integration tests
- Use Prisma's `$transaction` for test isolation
- Reset database state before each test suite using Prisma's `deleteMany`
- Use `@prisma/client` generated types for type safety in tests

### Coverage Goals

- Unit test coverage: 80% line coverage minimum
- Property tests: All 19 correctness properties covered
- Integration tests: All API endpoints covered
