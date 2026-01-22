/**
 * Base API client with fetch wrapper
 * Uses environment variable for API URL
 */

import type {
  AuthVerifyRequest,
  AuthVerifyResponse,
  CreateGameRequest,
  AddPlayerRequest,
  AddBringerRequest,
  GamesResponse,
  GameResponse,
  StatisticsData,
  ErrorResponse,
} from '../types';

// Get API URL from environment variable
const getApiUrl = (): string => {
  return import.meta.env.VITE_API_URL || 'http://localhost:3001';
};

// Custom error class for API errors
export class ApiError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

// Base fetch wrapper with error handling
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${getApiUrl()}${endpoint}`;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorData: ErrorResponse | null = null;
    try {
      errorData = await response.json();
    } catch {
      // Response is not JSON
    }

    if (errorData?.error) {
      throw new ApiError(
        errorData.error.message,
        errorData.error.code,
        errorData.error.details
      );
    }

    throw new ApiError(
      `HTTP ${response.status}: ${response.statusText}`,
      'HTTP_ERROR'
    );
  }

  return response.json();
}

// Authentication API
export const authApi = {
  verify: (password: string): Promise<AuthVerifyResponse> => {
    const body: AuthVerifyRequest = { password };
    return fetchApi<AuthVerifyResponse>('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};

// Games API
export const gamesApi = {
  getAll: (): Promise<GamesResponse> => {
    return fetchApi<GamesResponse>('/api/games');
  },

  create: (
    name: string,
    userName: string,
    isBringing: boolean
  ): Promise<GameResponse> => {
    const body: CreateGameRequest = { name, userName, isBringing };
    return fetchApi<GameResponse>('/api/games', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  addPlayer: (gameId: string, userName: string): Promise<GameResponse> => {
    const body: AddPlayerRequest = { userName };
    return fetchApi<GameResponse>(`/api/games/${gameId}/players`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  removePlayer: (gameId: string, userName: string): Promise<GameResponse> => {
    return fetchApi<GameResponse>(
      `/api/games/${gameId}/players/${encodeURIComponent(userName)}`,
      {
        method: 'DELETE',
      }
    );
  },

  addBringer: (gameId: string, userName: string): Promise<GameResponse> => {
    const body: AddBringerRequest = { userName };
    return fetchApi<GameResponse>(`/api/games/${gameId}/bringers`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  removeBringer: (gameId: string, userName: string): Promise<GameResponse> => {
    return fetchApi<GameResponse>(
      `/api/games/${gameId}/bringers/${encodeURIComponent(userName)}`,
      {
        method: 'DELETE',
      }
    );
  },
};

// Statistics API
export const statisticsApi = {
  get: (): Promise<StatisticsData> => {
    return fetchApi<StatisticsData>('/api/statistics');
  },
};

// Export all APIs as a single object
export const api = {
  auth: authApi,
  games: gamesApi,
  statistics: statisticsApi,
};

export default api;
