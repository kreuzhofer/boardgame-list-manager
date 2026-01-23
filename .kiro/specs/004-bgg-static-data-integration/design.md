# Design Document: BGG Static Data Integration

## Overview

This feature integrates BoardGameGeek (BGG) static data into the board game event application, enabling users to search and select games from a comprehensive database of ~170,000 board games. The system loads a CSV file at API startup, caches it in memory, and exposes a search endpoint for the frontend autocomplete. Selected games store their BGG ID and year published, enabling "Neuheit" (new release) stickers and quick access to BGG pages via an embedded modal.

### Key Design Decisions

1. **In-memory caching**: The CSV is loaded once at startup and kept in memory for fast searches. With ~170,000 entries (excluding expansions), memory usage is acceptable (~20-30MB).

2. **Prefix-based search with rank sorting**: Search uses case-insensitive prefix matching on game names, returning results sorted by BGG rank (lower rank = more popular).

3. **Graceful degradation**: If CSV loading fails, the API continues with an empty cache. Users can still add games manually without BGG data.

4. **Portal-based modal**: The BGG modal uses React's `createPortal` to render directly into `document.body`, avoiding stacking context issues.

## Architecture

```mermaid
flowchart TB
    subgraph Frontend
        AF[AddGameForm]
        AC[AutocompleteDropdown]
        GC[GameCard]
        NS[NeuheitSticker]
        BM[BggModal]
        
        AF --> AC
        GC --> NS
        GC --> BM
    end
    
    subgraph API
        SR[/api/bgg/search]
        BS[BggService]
        BC[BggCache]
        CSV[(boardgames_ranks.csv)]
        
        SR --> BS
        BS --> BC
        CSV -.->|startup load| BC
    end
    
    subgraph Database
        GM[Game Model]
    end
    
    AC -->|GET /api/bgg/search?q=| SR
    AF -->|POST /api/games| GM
```

## Components and Interfaces

### Backend Components

#### BggCache (api/src/services/bggCache.ts)

Singleton service that loads and stores BGG data in memory.

```typescript
interface BggGame {
  id: number;
  name: string;
  yearPublished: number | null;
  rank: number;
}

interface BggCache {
  // Load CSV data at startup
  initialize(csvPath: string): Promise<void>;
  
  // Search games by name prefix, returns max 10 results sorted by rank
  search(query: string): BggGame[];
  
  // Check if cache is loaded
  isLoaded(): boolean;
  
  // Get total count of cached games
  getCount(): number;
}
```

#### BggService (api/src/services/bggService.ts)

Service layer that wraps cache operations and handles business logic.

```typescript
interface BggSearchResult {
  id: number;
  name: string;
  yearPublished: number | null;
}

interface BggService {
  // Search for games, returns empty array if query < 2 chars
  searchGames(query: string): BggSearchResult[];
}
```

#### BGG Routes (api/src/routes/bgg.routes.ts)

Express router for BGG-related endpoints.

```typescript
// GET /api/bgg/search?q={query}
// Response: { results: BggSearchResult[] }
```

### Frontend Components

#### AutocompleteDropdown (frontend/src/components/AutocompleteDropdown.tsx)

Dropdown component showing search results below the input field.

```typescript
interface BggSearchResult {
  id: number;
  name: string;
  yearPublished: number | null;
}

interface AutocompleteDropdownProps {
  query: string;
  isOpen: boolean;
  results: BggSearchResult[];
  isLoading: boolean;
  selectedIndex: number;
  onSelect: (result: BggSearchResult) => void;
  onClose: () => void;
}
```

#### NeuheitSticker (frontend/src/components/NeuheitSticker.tsx)

Badge component for new releases.

```typescript
interface NeuheitStickerProps {
  yearPublished: number;
}

// Displays "Neuheit {year}" with orange/gold background
// Only renders if yearPublished is current year or previous year
```

#### BggModal (frontend/src/components/BggModal.tsx)

Full-screen modal with iframe to BGG page.

```typescript
interface BggModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameName: string;
  bggId: number;
}

// Uses createPortal to render into document.body
// Iframe loads https://boardgamegeek.com/boardgame/{bggId}
```

#### Updated AddGameForm

The existing AddGameForm will be enhanced with:
- Autocomplete functionality using a custom hook
- State for selected BGG game (bggId, yearPublished)
- Debounced API calls (300ms)

#### Updated GameCard

The existing GameCard will be enhanced with:
- NeuheitSticker display when yearPublished is recent
- BGG button (green with info icon) when bggId exists
- BggModal integration

### API Client Extensions (frontend/src/api/client.ts)

```typescript
// BGG API
export const bggApi = {
  search: (query: string): Promise<BggSearchResponse> => {
    return fetchApi<BggSearchResponse>(`/api/bgg/search?q=${encodeURIComponent(query)}`);
  },
};
```

### Custom Hook (frontend/src/hooks/useBggSearch.ts)

```typescript
interface UseBggSearchResult {
  results: BggSearchResult[];
  isLoading: boolean;
  error: string | null;
}

function useBggSearch(query: string, debounceMs?: number): UseBggSearchResult;
```

## Data Models

### Database Schema Changes (Prisma)

```prisma
model Game {
  id            String   @id @default(uuid())
  name          String   @unique
  ownerId       String?  @map("owner_id")
  bggId         Int?     @map("bgg_id")        // NEW: BGG game ID
  yearPublished Int?     @map("year_published") // NEW: Publication year
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  owner         User?    @relation(fields: [ownerId], references: [id], onDelete: SetNull)
  players       Player[]
  bringers      Bringer[]

  @@index([ownerId])
  @@index([bggId])
  @@map("games")
}
```

### CSV Data Structure

The CSV file `api/data/boardgames_ranks.csv` contains:

| Column | Type | Description |
|--------|------|-------------|
| id | integer | BGG game ID |
| name | string | Game name |
| yearpublished | integer | Publication year |
| rank | integer | BGG rank (1 = best) |
| is_expansion | integer | 1 = expansion, 0 = base game |
| ... | ... | Other columns (ignored) |

### TypeScript Types

```typescript
// API types (frontend/src/types/index.ts)
export interface BggSearchResult {
  id: number;
  name: string;
  yearPublished: number | null;
}

export interface BggSearchResponse {
  results: BggSearchResult[];
}

// Updated Game interface
export interface Game {
  id: string;
  name: string;
  owner: User | null;
  bggId: number | null;        // NEW
  yearPublished: number | null; // NEW
  players: Player[];
  bringers: Bringer[];
  status: GameStatus;
  createdAt: Date;
}

// Updated CreateGameRequest
export interface CreateGameRequest {
  name: string;
  userId: string;
  isBringing: boolean;
  isPlaying: boolean;
  bggId?: number;           // NEW
  yearPublished?: number;   // NEW
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: CSV Parsing Preserves Game Data

*For any* valid CSV row containing a base game (is_expansion=0), parsing that row SHALL produce a BggGame object with the same id, name, and yearPublished values as the original row.

**Validates: Requirements 1.2**

### Property 2: Expansion Filtering

*For any* CSV data containing entries with is_expansion=1, the BGG_Cache SHALL NOT contain any of those expansion entries after parsing.

**Validates: Requirements 1.3**

### Property 3: Case-Insensitive Search Matching

*For any* search query string and any game in the cache, if the game's name contains the query as a substring (case-insensitive), that game SHALL be included in the search results.

**Validates: Requirements 2.2**

### Property 4: Search Results Ordering and Limiting

*For any* search query that produces matches, the returned results SHALL be sorted by BGG rank in ascending order (lower rank first) and limited to a maximum of 10 results.

**Validates: Requirements 2.3**

### Property 5: Search Response Structure

*For any* game returned in search results, the response object SHALL include id (number), name (string), and yearPublished (number or null).

**Validates: Requirements 2.5**

### Property 6: Autocomplete Dropdown Visibility

*For any* input value with 1 or more characters and non-empty search results, the Autocomplete_Dropdown SHALL be visible. For empty input, the dropdown SHALL be hidden.

**Validates: Requirements 3.1**

### Property 7: Dropdown Result Limiting

*For any* number of search results returned from the API, the Autocomplete_Dropdown SHALL display at most 5 results.

**Validates: Requirements 3.3**

### Property 8: Selection Updates Form State

*For any* game selected from the Autocomplete_Dropdown, the form state SHALL contain the selected game's name in the input field, and the bggId and yearPublished values stored for submission.

**Validates: Requirements 3.4, 3.5**

### Property 9: Game Creation BGG Data Persistence

*For any* game created with a BGG selection, the stored game SHALL have the provided bggId and yearPublished values. *For any* game created without a BGG selection, the stored game SHALL have null for both bggId and yearPublished.

**Validates: Requirements 4.3, 4.4**

### Property 10: Neuheit Sticker Display Logic

*For any* game with a yearPublished value, the Neuheit_Sticker SHALL be displayed if and only if yearPublished equals the current year or the previous year (calculated from system date).

**Validates: Requirements 5.1**

### Property 11: Neuheit Sticker Text Format

*For any* game where the Neuheit_Sticker is displayed, the sticker text SHALL be "Neuheit {yearPublished}" where {yearPublished} is the game's publication year.

**Validates: Requirements 5.2**

### Property 12: BGG Button Visibility

*For any* game with a non-null bggId, the GameCard SHALL display the BGG button. *For any* game with null bggId, the BGG button SHALL NOT be displayed.

**Validates: Requirements 6.1, 6.2**

### Property 13: BGG Modal Iframe URL

*For any* bggId value, the BGG_Modal iframe src attribute SHALL be exactly `https://boardgamegeek.com/boardgame/{bggId}`.

**Validates: Requirements 7.3**

## Error Handling

### Backend Error Handling

| Error Scenario | Handling | Response |
|----------------|----------|----------|
| CSV file not found | Log error, continue with empty cache | Search returns empty results |
| CSV parse error | Log error, skip malformed rows | Continue with valid rows |
| Invalid query parameter | Return empty results | `{ results: [] }` |
| Query too short (<2 chars) | Return empty results | `{ results: [] }` |

### Frontend Error Handling

| Error Scenario | Handling | User Feedback |
|----------------|----------|---------------|
| API request fails | Catch error, clear results | No dropdown shown, allow manual entry |
| Network timeout | Catch error, clear results | No dropdown shown, allow manual entry |
| BGG iframe fails to load | Show iframe with error state | User sees BGG's error page |

### Error Messages (German)

- API search error: "Suche fehlgeschlagen. Bitte manuell eingeben."
- Network error: "Netzwerkfehler. Bitte Verbindung prüfen."

## Testing Strategy

### Unit Tests

Unit tests focus on specific examples and edge cases:

**Backend:**
- CSV parsing with valid data
- CSV parsing with malformed rows (skip gracefully)
- Search with empty query (returns empty)
- Search with 1 character (returns empty)
- Search with no matches (returns empty)
- Search result ordering by rank

**Frontend:**
- NeuheitSticker renders for current year
- NeuheitSticker renders for previous year
- NeuheitSticker does not render for older years
- NeuheitSticker does not render when yearPublished is null
- BGG button renders when bggId exists
- BGG button does not render when bggId is null
- Modal opens on button click
- Modal closes on X click, Escape, backdrop click

### Property-Based Tests

Property-based tests verify universal properties across many generated inputs. Each test runs minimum 100 iterations.

**Library:** fast-check (TypeScript)

**Backend Properties:**

1. **Property 2: Expansion Filtering**
   - Generate random CSV data with mix of base games and expansions
   - Verify cache never contains expansions
   - Tag: `Feature: bgg-static-data-integration, Property 2: Expansion Filtering`

2. **Property 3: Case-Insensitive Search Matching**
   - Generate random game names and query strings
   - Verify matching behavior is case-insensitive
   - Tag: `Feature: bgg-static-data-integration, Property 3: Case-Insensitive Search Matching`

3. **Property 4: Search Results Ordering and Limiting**
   - Generate random cache data with various ranks
   - Verify results are sorted by rank and limited to 10
   - Tag: `Feature: bgg-static-data-integration, Property 4: Search Results Ordering and Limiting`

**Frontend Properties:**

4. **Property 7: Dropdown Result Limiting**
   - Generate random result arrays of various sizes
   - Verify dropdown never shows more than 5
   - Tag: `Feature: bgg-static-data-integration, Property 7: Dropdown Result Limiting`

5. **Property 10: Neuheit Sticker Display Logic**
   - Generate random yearPublished values
   - Verify sticker shows only for current/previous year
   - Tag: `Feature: bgg-static-data-integration, Property 10: Neuheit Sticker Display Logic`

6. **Property 13: BGG Modal Iframe URL**
   - Generate random bggId values
   - Verify iframe URL is correctly formatted
   - Tag: `Feature: bgg-static-data-integration, Property 13: BGG Modal Iframe URL`

### Integration Tests

- End-to-end flow: type in autocomplete → select game → submit → verify stored data
- BGG modal opens with correct URL for stored game
- Neuheit sticker displays correctly for newly created games
