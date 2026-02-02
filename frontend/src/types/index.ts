/**
 * TypeScript types for the Board Game Event application
 * Matching the API data models from the design document
 */

// SSE Event Types
export * from './sse';

// User entity
export interface User {
  id: string;
  name: string;
}

// Player who wants to play a game
export interface Player {
  id: string;
  user: User;
  addedAt: Date;
}

// Bringer who will bring a game to the event
export interface Bringer {
  id: string;
  user: User;
  addedAt: Date;
}

// Game status - derived from bringers count
export type GameStatus = 'wunsch' | 'verfuegbar';

// Game entry in the shared list
export interface Game {
  id: string;
  name: string;
  owner: User | null;
  bggId: number | null;
  yearPublished: number | null;
  bggRating: number | null;
  addedAsAlternateName: string | null;
  alternateNames: string[];
  isPrototype: boolean;
  players: Player[];
  bringers: Bringer[];
  status: GameStatus;
  createdAt: Date;
}

// Statistics data for the dashboard
export interface StatisticsData {
  totalGames: number;
  totalParticipants: number;
  availableGames: number;
  requestedGames: number;
  popularGames: PopularGame[];
}

// Popular game entry for statistics
export interface PopularGame {
  id: string;
  name: string;
  playerCount: number;
}

// API request/response types
export interface AuthVerifyRequest {
  password: string;
}

export interface AuthVerifyResponse {
  success: boolean;
  message?: string;
}

export interface CreateGameRequest {
  name: string;
  userId: string;
  isBringing: boolean;
  isPlaying: boolean;
  isPrototype?: boolean;
  bggId?: number;
  yearPublished?: number;
  bggRating?: number;
  addedAsAlternateName?: string;
  alternateNames?: string[];
}

export interface AddPlayerRequest {
  userId: string;
}

export interface AddBringerRequest {
  userId: string;
}

export interface CreateUserRequest {
  name: string;
}

export interface UpdateUserRequest {
  name: string;
}

export interface GamesResponse {
  games: Game[];
}

export interface GameResponse {
  game: Game;
}

export interface UsersResponse {
  users: User[];
}

export interface UserResponse {
  user: User;
}

// Error response from API
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// BGG Search types
export interface BggSearchResult {
  id: number;
  name: string;
  yearPublished: number | null;
  rating: number | null;
  matchedAlternateName?: string | null;
  alternateNames?: string[];
}

export interface BggSearchResponse {
  results: BggSearchResult[];
  hasMore: boolean;
}
