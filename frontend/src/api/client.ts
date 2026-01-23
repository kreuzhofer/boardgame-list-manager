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
  CreateUserRequest,
  UpdateUserRequest,
  GamesResponse,
  GameResponse,
  UsersResponse,
  UserResponse,
  StatisticsData,
  ErrorResponse,
  BggSearchResponse,
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

// Users API
export const usersApi = {
  getAll: (): Promise<UsersResponse> => {
    return fetchApi<UsersResponse>('/api/users');
  },

  getById: (id: string): Promise<UserResponse> => {
    return fetchApi<UserResponse>(`/api/users/${id}`);
  },

  create: (name: string): Promise<UserResponse> => {
    const body: CreateUserRequest = { name };
    return fetchApi<UserResponse>('/api/users', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  update: (id: string, name: string): Promise<UserResponse> => {
    const body: UpdateUserRequest = { name };
    return fetchApi<UserResponse>(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  delete: (id: string): Promise<{ success: boolean }> => {
    return fetchApi<{ success: boolean }>(`/api/users/${id}`, {
      method: 'DELETE',
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
    userId: string,
    isBringing: boolean,
    isPlaying: boolean,
    bggId?: number,
    yearPublished?: number
  ): Promise<GameResponse> => {
    const body: CreateGameRequest = { name, userId, isBringing, isPlaying, bggId, yearPublished };
    return fetchApi<GameResponse>('/api/games', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  delete: (gameId: string, userId: string): Promise<{ success: boolean }> => {
    return fetchApi<{ success: boolean }>(`/api/games/${gameId}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': userId,
      },
    });
  },

  addPlayer: (gameId: string, userId: string): Promise<GameResponse> => {
    const body: AddPlayerRequest = { userId };
    return fetchApi<GameResponse>(`/api/games/${gameId}/players`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  removePlayer: (gameId: string, userId: string): Promise<GameResponse> => {
    return fetchApi<GameResponse>(
      `/api/games/${gameId}/players/${userId}`,
      {
        method: 'DELETE',
      }
    );
  },

  addBringer: (gameId: string, userId: string): Promise<GameResponse> => {
    const body: AddBringerRequest = { userId };
    return fetchApi<GameResponse>(`/api/games/${gameId}/bringers`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  removeBringer: (gameId: string, userId: string): Promise<GameResponse> => {
    return fetchApi<GameResponse>(
      `/api/games/${gameId}/bringers/${userId}`,
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

// BGG API
export const bggApi = {
  search: (query: string): Promise<BggSearchResponse> => {
    return fetchApi<BggSearchResponse>(`/api/bgg/search?q=${encodeURIComponent(query)}`);
  },
};

// Export all APIs as a single object
export const api = {
  auth: authApi,
  users: usersApi,
  games: gamesApi,
  statistics: statisticsApi,
  bgg: bggApi,
};

export default api;
