// Game entity types
export interface GameEntity {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  players: PlayerEntity[];
  bringers: BringerEntity[];
}

export interface PlayerEntity {
  id: string;
  gameId: string;
  userName: string;
  addedAt: Date;
}

export interface BringerEntity {
  id: string;
  gameId: string;
  userName: string;
  addedAt: Date;
}

// DTOs
export interface CreateGameDto {
  name: string;
  userName: string;
  isBringing: boolean;
}

export interface CreatePlayerDto {
  userName: string;
}

export interface CreateBringerDto {
  userName: string;
}

// API Response types
export interface Game {
  id: string;
  name: string;
  players: Player[];
  bringers: Bringer[];
  status: 'wunsch' | 'verfuegbar';
  createdAt: Date;
}

export interface Player {
  id: string;
  name: string;
  addedAt: Date;
}

export interface Bringer {
  id: string;
  name: string;
  addedAt: Date;
}

// Statistics types
export interface StatisticsData {
  totalGames: number;
  totalParticipants: number;
  availableGames: number;
  requestedGames: number;
  popularGames: PopularGame[];
}

export interface PopularGame {
  id: string;
  name: string;
  playerCount: number;
}

// Error response type
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Environment configuration
export interface EnvironmentConfig {
  DATABASE_URL: string;
  EVENT_PASSWORD: string;
  EVENT_NAME: string;
  API_PORT: number;
  CORS_ORIGIN: string;
}
