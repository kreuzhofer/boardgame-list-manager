// User entity type
export interface UserEntity {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

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
  userId: string;
  addedAt: Date;
  user: UserEntity;
}

export interface BringerEntity {
  id: string;
  gameId: string;
  userId: string;
  addedAt: Date;
  user: UserEntity;
}

// DTOs
export interface CreateGameDto {
  name: string;
  userId: string;
  isBringing: boolean;
}

export interface CreatePlayerDto {
  userId: string;
}

export interface CreateBringerDto {
  userId: string;
}

// API Response types
export interface User {
  id: string;
  name: string;
}

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
  user: User;
  addedAt: Date;
}

export interface Bringer {
  id: string;
  user: User;
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
