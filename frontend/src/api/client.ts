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
import type { Account, Session, LoginResponse, RegisterResponse } from '../types/account';

// Get API URL from environment variable
const getApiUrl = (): string => {
  return import.meta.env.VITE_API_URL || 'http://localhost:3001';
};

// Token storage key
const TOKEN_KEY = 'auth_token';

// Get stored token
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

// Set token
export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

// Remove token
export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
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
  options: RequestInit = {},
  includeAuth: boolean = false
): Promise<T> {
  const url = `${getApiUrl()}${endpoint}`;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add auth header if requested and token exists
  if (includeAuth) {
    const token = getToken();
    if (token) {
      (defaultHeaders as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorData: ErrorResponse | { error: string; message: string } | null = null;
    try {
      errorData = await response.json();
    } catch {
      // Response is not JSON
    }

    // Handle account API error format
    if (errorData && 'error' in errorData && 'message' in errorData && typeof errorData.error === 'string') {
      throw new ApiError(
        errorData.message,
        errorData.error
      );
    }

    // Handle standard error format
    if (errorData && 'error' in errorData && typeof errorData.error === 'object' && errorData.error !== null) {
      const err = errorData.error as { message: string; code: string; details?: Record<string, unknown> };
      throw new ApiError(
        err.message,
        err.code,
        err.details
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

  getById: (gameId: string): Promise<GameResponse> => {
    return fetchApi<GameResponse>(`/api/games/${gameId}`);
  },

  create: (
    name: string,
    userId: string,
    isBringing: boolean,
    isPlaying: boolean,
    isPrototype: boolean,
    bggId?: number,
    yearPublished?: number,
    bggRating?: number,
    addedAsAlternateName?: string,
    alternateNames?: string[]
  ): Promise<GameResponse> => {
    const body: CreateGameRequest = { 
      name, 
      userId, 
      isBringing, 
      isPlaying, 
      isPrototype,
      bggId, 
      yearPublished, 
      bggRating,
      addedAsAlternateName,
      alternateNames
    };
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

  /**
   * Toggle prototype status for a game
   * @param gameId - The game's unique identifier
   * @param isPrototype - The new prototype status
   * @param userId - The user's ID (must be owner)
   * @returns The updated game
   * Requirements: 022-prototype-toggle 1.1
   */
  togglePrototype: (gameId: string, isPrototype: boolean, userId: string): Promise<GameResponse> => {
    return fetchApi<GameResponse>(`/api/games/${gameId}/prototype`, {
      method: 'PATCH',
      headers: {
        'x-user-id': userId,
      },
      body: JSON.stringify({ isPrototype }),
    });
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

// Account API
export const accountsApi = {
  register: (email: string, password: string): Promise<RegisterResponse> => {
    return fetchApi<RegisterResponse>('/api/accounts/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  login: (email: string, password: string): Promise<LoginResponse> => {
    return fetchApi<LoginResponse>('/api/accounts/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  getMe: (): Promise<{ account: Account }> => {
    return fetchApi<{ account: Account }>('/api/accounts/me', {}, true);
  },

  changePassword: (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    return fetchApi<{ success: boolean; message: string }>('/api/accounts/me/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    }, true);
  },

  deactivate: (password: string): Promise<{ success: boolean; message: string }> => {
    return fetchApi<{ success: boolean; message: string }>('/api/accounts/me/deactivate', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }, true);
  },

  promoteToAdmin: (accountId: string): Promise<{ account: Account }> => {
    return fetchApi<{ account: Account }>(`/api/accounts/${accountId}/promote`, {
      method: 'POST',
    }, true);
  },
};

// Sessions API
export const sessionsApi = {
  getAll: (): Promise<{ sessions: Session[] }> => {
    return fetchApi<{ sessions: Session[] }>('/api/sessions', {}, true);
  },

  logoutAll: (): Promise<{ success: boolean; message: string }> => {
    return fetchApi<{ success: boolean; message: string }>('/api/sessions', {
      method: 'DELETE',
    }, true);
  },

  logout: (sessionId: string): Promise<{ success: boolean }> => {
    return fetchApi<{ success: boolean }>(`/api/sessions/${sessionId}`, {
      method: 'DELETE',
    }, true);
  },
};

// Thumbnails API
export const thumbnailsApi = {
  /**
   * Upload a custom thumbnail for a game
   * @param gameId - The game's unique identifier
   * @param file - The image file to upload
   * @param userId - The user's ID (must be owner)
   * @returns Success response
   * Requirements: 023-custom-thumbnail-upload 1.1
   */
  upload: async (gameId: string, file: File, userId: string): Promise<{ success: boolean }> => {
    const url = `${getApiUrl()}/api/thumbnails/${gameId}`;
    const formData = new FormData();
    formData.append('thumbnail', file);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-user-id': userId,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorData: { error?: { message: string; code: string } } | null = null;
      try {
        errorData = await response.json();
      } catch {
        // Response is not JSON
      }

      if (errorData?.error) {
        throw new ApiError(errorData.error.message, errorData.error.code);
      }

      throw new ApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        'HTTP_ERROR'
      );
    }

    return response.json();
  },

  /**
   * Get the URL for a custom thumbnail
   * @param gameId - The game's unique identifier
   * @param size - Image size ('micro' or 'square200')
   * @returns The URL to the thumbnail image
   * Requirements: 023-custom-thumbnail-upload 2.3
   */
  getUrl: (gameId: string, size: 'micro' | 'square200'): string => {
    return `${getApiUrl()}/api/thumbnails/${gameId}/${size}`;
  },

  /**
   * Check if a game has a custom thumbnail
   * @param gameId - The game's unique identifier
   * @returns Whether the thumbnail exists
   */
  exists: (gameId: string): Promise<{ exists: boolean }> => {
    return fetchApi<{ exists: boolean }>(`/api/thumbnails/${gameId}/exists`);
  },
};

// Export all APIs as a single object
export const api = {
  auth: authApi,
  users: usersApi,
  games: gamesApi,
  statistics: statisticsApi,
  bgg: bggApi,
  accounts: accountsApi,
  sessions: sessionsApi,
  thumbnails: thumbnailsApi,
};

export default api;
