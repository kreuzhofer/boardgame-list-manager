// SSE Event Types
export * from './sse';

// Participant entity type
export interface ParticipantEntity {
  id: string;
  eventId: string | null;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// Game entity types
export interface GameEntity {
  id: string;
  eventId: string | null;
  name: string;
  ownerId: string | null;
  bggId: number | null;
  yearPublished: number | null;
  bggRating: number | null;
  addedAsAlternateName: string | null;
  alternateNames: string[];
  isPrototype: boolean;
  createdAt: Date;
  updatedAt: Date;
  owner: ParticipantEntity | null;
  players: PlayerEntity[];
  bringers: BringerEntity[];
}

export interface PlayerEntity {
  id: string;
  gameId: string;
  participantId: string;
  addedAt: Date;
  participant: ParticipantEntity;
}

export interface BringerEntity {
  id: string;
  gameId: string;
  participantId: string;
  addedAt: Date;
  participant: ParticipantEntity;
}

// DTOs
export interface CreateGameDto {
  eventId: string;
  name: string;
  participantId: string;
  isBringing: boolean;
  isPlaying: boolean;
  isPrototype?: boolean;
  bggId?: number;
  yearPublished?: number;
  bggRating?: number;
  addedAsAlternateName?: string;
  alternateNames?: string[];
}

export interface CreatePlayerDto {
  participantId: string;
}

export interface CreateBringerDto {
  participantId: string;
}

// API Response types
export interface Participant {
  id: string;
  name: string;
}

export interface Game {
  id: string;
  name: string;
  owner: Participant | null;
  bggId: number | null;
  yearPublished: number | null;
  bggRating: number | null;
  addedAsAlternateName: string | null;
  alternateNames: string[];
  isPrototype: boolean;
  isHidden: boolean;
  players: Player[];
  bringers: Bringer[];
  status: 'wunsch' | 'verfuegbar';
  createdAt: Date;
}

export interface Player {
  id: string;
  participant: Participant;
  addedAt: Date;
}

export interface Bringer {
  id: string;
  participant: Participant;
  addedAt: Date;
}

// Statistics types
export interface StatisticsData {
  totalGames: number;
  totalParticipants: number;
  availableGames: number;
  requestedGames: number;
  popularGames: PopularGame[];
  releaseYearCounts: ReleaseYearCount[];
}

export interface PopularGame {
  id: string;
  name: string;
  playerCount: number;
}

export interface ReleaseYearCount {
  year: number;
  count: number;
}

export interface StatisticsTimelinePoint {
  date: string;
  gamesAdded: number;
  playersAdded: number;
  newParticipants: number;
  totalParticipants: number;
  activeParticipants: number;
}

export interface StatisticsTimelineData {
  points: StatisticsTimelinePoint[];
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
