/**
 * TypeScript types for the Board Game Event application
 * Matching the API data models from the design document
 */

// Player who wants to play a game
export interface Player {
  id: string;
  name: string;
  addedAt: Date;
}

// Bringer who will bring a game to the event
export interface Bringer {
  id: string;
  name: string;
  addedAt: Date;
}

// Game status - derived from bringers count
export type GameStatus = 'wunsch' | 'verfuegbar';

// Game entry in the shared list
export interface Game {
  id: string;
  name: string;
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
  userName: string;
  isBringing: boolean;
}

export interface AddPlayerRequest {
  userName: string;
}

export interface AddBringerRequest {
  userName: string;
}

export interface GamesResponse {
  games: Game[];
}

export interface GameResponse {
  game: Game;
}

// Error response from API
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
