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
  CreateParticipantRequest,
  UpdateParticipantRequest,
  GamesResponse,
  GameResponse,
  ParticipantsResponse,
  ParticipantResponse,
  StatisticsData,
  StatisticsTimelineData,
  ErrorResponse,
  BggSearchResponse,
} from '../types';
import type { Account, Session, LoginResponse, RegisterResponse, AccountsResponse, OwnedEventsResponse, Participation, ClaimCandidate, ClaimableUser } from '../types/account';
import type { Event, EventPublicInfo, CreateEventRequest, UpdateEventRequest, EventDeletionPreview, DeleteEventResponse } from '../types/event';

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

// Event token storage — per-event keyed by slug, backward-compatible
export const EVENT_TOKEN_KEY = 'boardgame_event_token';

function eventTokenKey(slug?: string): string {
  return slug ? `${EVENT_TOKEN_KEY}:${slug}` : EVENT_TOKEN_KEY;
}

export const getEventToken = (slug?: string): string | null => {
  return localStorage.getItem(eventTokenKey(slug));
};

export const setEventToken = (token: string, slug?: string): void => {
  localStorage.setItem(eventTokenKey(slug), token);
};

export const removeEventToken = (slug?: string): void => {
  localStorage.removeItem(eventTokenKey(slug));
};

/**
 * Drop every per-event session artefact in localStorage — event JWTs
 * (`boardgame_event_token:*`) and cached participant IDs
 * (`boardgame_event_participant_id*`). Called by `logout()` so an
 * account user who logs out doesn't keep walking past the password
 * gate on subsequent visits to events they previously authenticated
 * to. Anonymous users (who never log in via account) are unaffected
 * since their flow doesn't go through `logout()`.
 */
export const clearAllEventSessionData = (): void => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        key === EVENT_TOKEN_KEY ||
        key.startsWith(`${EVENT_TOKEN_KEY}:`) ||
        key === 'boardgame_event_participant_id' ||
        key.startsWith('boardgame_event_participant_id:') ||
        key === 'boardgame_event_user_id' /* legacy pre-migration key */
      ) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) localStorage.removeItem(key);
  } catch {
    // localStorage may be unavailable (private mode, quota, etc.).
    // Logout proceeds regardless — worst case the next visit hits a
    // stale event JWT, but the account is already signed out.
  }
};

// Active event slug — set by EventContext so fetchApi sends the right token
let activeEventSlug: string | undefined;

export const setActiveEventSlug = (slug: string | undefined): void => {
  activeEventSlug = slug;
};

export const getActiveEventSlug = (): string | undefined => {
  return activeEventSlug;
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

  // Attach event token as fallback when no account token is present
  if (!(defaultHeaders as Record<string, string>)['Authorization']) {
    const eventToken = getEventToken(activeEventSlug);
    if (eventToken) {
      (defaultHeaders as Record<string, string>)['Authorization'] = `Bearer ${eventToken}`;
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
  verify: (password: string, slug?: string): Promise<AuthVerifyResponse> => {
    const body: AuthVerifyRequest & { slug?: string } = { password };
    if (slug) body.slug = slug;
    // Include the account JWT when present so the backend can also
    // upsert an EventParticipation row alongside issuing the event
    // token. Anonymous verifies still work — no account token, no row.
    return fetchApi<AuthVerifyResponse>('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify(body),
    }, true);
  },

  /** Request a magic-link email. Always resolves (server returns 200 even
   *  for unknown emails) — never reveal whether the address exists. */
  requestMagicLink: (email: string): Promise<{ ok: true }> =>
    fetchApi<{ ok: true }>('/api/auth/magic-link/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  /** Consume a magic-link token. Returns the same shape as password login. */
  consumeMagicLink: (
    token: string,
  ): Promise<{
    token: string;
    account: { id: string; email: string; role: string; status: string; createdAt: string };
    targetPath: string;
  }> =>
    fetchApi(`/api/auth/magic-link/consume?token=${encodeURIComponent(token)}`),
};

// Participants API
export const participantsApi = {
  getAll: async (): Promise<ParticipantsResponse> => {
    const response = await fetchApi<ParticipantsResponse & { users?: ParticipantsResponse['participants'] }>(
      '/api/participants'
    );
    return { participants: response.participants ?? response.users ?? [] };
  },

  getById: async (id: string): Promise<ParticipantResponse> => {
    const response = await fetchApi<ParticipantResponse & { user?: ParticipantResponse['participant'] }>(
      `/api/participants/${id}`
    );
    return { participant: response.participant ?? response.user! };
  },

  create: async (name: string): Promise<ParticipantResponse> => {
    const body: CreateParticipantRequest = { name };
    const response = await fetchApi<ParticipantResponse & { user?: ParticipantResponse['participant'] }>('/api/participants', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return { participant: response.participant ?? response.user! };
  },

  update: async (id: string, name: string): Promise<ParticipantResponse> => {
    const body: UpdateParticipantRequest = { name };
    const response = await fetchApi<ParticipantResponse & { user?: ParticipantResponse['participant'] }>(`/api/participants/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return { participant: response.participant ?? response.user! };
  },

  delete: (id: string): Promise<{ success: boolean }> => {
    return fetchApi<{ success: boolean }>(`/api/participants/${id}`, {
      method: 'DELETE',
    });
  },
};

// Backwards-compatible alias (event participants were previously called users)
export const usersApi = participantsApi;

// Games API
export const gamesApi = {
  getAll: (participantId?: string): Promise<GamesResponse> => {
    return fetchApi<GamesResponse>('/api/games', {
      headers: participantId ? { 'x-participant-id': participantId } : undefined,
    });
  },

  getById: (gameId: string, participantId?: string): Promise<GameResponse> => {
    return fetchApi<GameResponse>(`/api/games/${gameId}`, {
      headers: participantId ? { 'x-participant-id': participantId } : undefined,
    });
  },

  create: (
    name: string,
    participantId: string,
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
      participantId, 
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

  delete: (gameId: string, participantId: string, includeAuth: boolean = false): Promise<{ success: boolean }> => {
    return fetchApi<{ success: boolean }>(`/api/games/${gameId}`, {
      method: 'DELETE',
      headers: {
        'x-participant-id': participantId,
      },
    }, includeAuth);
  },

  addPlayer: (gameId: string, participantId: string): Promise<GameResponse> => {
    const body: AddPlayerRequest = { participantId };
    return fetchApi<GameResponse>(`/api/games/${gameId}/players`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  removePlayer: (gameId: string, participantId: string): Promise<GameResponse> => {
    return fetchApi<GameResponse>(
      `/api/games/${gameId}/players/${participantId}`,
      {
        method: 'DELETE',
      }
    );
  },

  addBringer: (gameId: string, participantId: string): Promise<GameResponse> => {
    const body: AddBringerRequest = { participantId };
    return fetchApi<GameResponse>(`/api/games/${gameId}/bringers`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  removeBringer: (gameId: string, participantId: string): Promise<GameResponse> => {
    return fetchApi<GameResponse>(
      `/api/games/${gameId}/bringers/${participantId}`,
      {
        method: 'DELETE',
      }
    );
  },

  hideGame: (gameId: string, participantId: string): Promise<GameResponse> => {
    return fetchApi<GameResponse>(`/api/games/${gameId}/hidden`, {
      method: 'POST',
      body: JSON.stringify({ participantId }),
    });
  },

  unhideGame: (gameId: string, participantId: string): Promise<GameResponse> => {
    return fetchApi<GameResponse>(`/api/games/${gameId}/hidden/${participantId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Toggle prototype status for a game
   * @param gameId - The game's unique identifier
   * @param isPrototype - The new prototype status
   * @param participantId - The participant's ID (must be owner)
   * @returns The updated game
   * Requirements: 022-prototype-toggle 1.1
   */
  togglePrototype: (gameId: string, isPrototype: boolean, participantId: string): Promise<GameResponse> => {
    return fetchApi<GameResponse>(`/api/games/${gameId}/prototype`, {
      method: 'PATCH',
      headers: {
        'x-participant-id': participantId,
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
  getTimeline: (): Promise<StatisticsTimelineData> => {
    return fetchApi<StatisticsTimelineData>('/api/statistics/timeline');
  },
};

// BGG API
export const bggApi = {
  search: (query: string): Promise<BggSearchResponse> => {
    return fetchApi<BggSearchResponse>(`/api/bgg/search?q=${encodeURIComponent(query)}`);
  },

  startImport: (): Promise<{ message: string }> => {
    return fetchApi<{ message: string }>('/api/bgg/import', { method: 'POST' }, true);
  },

  stopImport: (): Promise<{ message: string; stopped: boolean }> => {
    return fetchApi<{ message: string; stopped: boolean }>('/api/bgg/import', { method: 'DELETE' }, true);
  },

  getImportStatus: (): Promise<import('../types/adminSse').ImportStatus> => {
    return fetchApi<import('../types/adminSse').ImportStatus>('/api/bgg/import/status', {}, true);
  },

  startEnrichment: (
    options: {
      force?: boolean;
      onlyReferenced?: boolean;
      source?: 'bgg' | 'cache';
    } = {},
  ): Promise<{ message: string }> => {
    return fetchApi<{ message: string }>(
      '/api/bgg/enrich',
      { method: 'POST', body: JSON.stringify(options) },
      true,
    );
  },

  getEnrichmentStatus: (): Promise<import('../types/adminSse').BulkEnrichmentStatus> => {
    return fetchApi<import('../types/adminSse').BulkEnrichmentStatus>('/api/bgg/enrich/status', {}, true);
  },

  stopEnrichment: (): Promise<{ message: string; stopped: boolean }> => {
    return fetchApi<{ message: string; stopped: boolean }>('/api/bgg/enrich', { method: 'DELETE' }, true);
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

  updateProfile: (data: { displayName?: string | null }): Promise<{ account: Account }> => {
    return fetchApi<{ account: Account }>('/api/accounts/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, true);
  },

  deactivate: (password: string): Promise<{ success: boolean; message: string }> => {
    return fetchApi<{ success: boolean; message: string }>('/api/accounts/me/deactivate', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }, true);
  },

  requestEmailChange: (newEmail: string): Promise<{ success: boolean; message: string }> => {
    return fetchApi<{ success: boolean; message: string }>('/api/accounts/me/email', {
      method: 'POST',
      body: JSON.stringify({ newEmail }),
    }, true);
  },

  confirmEmailChange: (token: string): Promise<{ success: boolean; account: Account }> => {
    return fetchApi<{ success: boolean; account: Account }>('/api/accounts/email-change/confirm', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  getMyParticipations: (): Promise<{ participations: Participation[] }> => {
    return fetchApi<{ participations: Participation[] }>('/api/accounts/me/participations', {}, true);
  },

  // ── Legacy claim flow ─────────────────────────────────────────
  getClaimCandidates: (): Promise<{ candidates: ClaimCandidate[] }> => {
    return fetchApi<{ candidates: ClaimCandidate[] }>('/api/accounts/me/claim-candidates', {}, true);
  },

  /** Returns the unclaimed users + previews for an event after the
   *  caller proves they know the event password. */
  unlockClaimCandidate: (eventId: string, password: string): Promise<{ users: ClaimableUser[] }> => {
    return fetchApi<{ users: ClaimableUser[] }>(
      `/api/accounts/me/claim-candidates/${eventId}/users`,
      { method: 'POST', body: JSON.stringify({ password }) },
      true,
    );
  },

  /** Atomic claim. Re-sends the password (server re-verifies). */
  claimUser: (userId: string, password: string): Promise<{ success: true; eventId: string; userName: string }> => {
    return fetchApi<{ success: true; eventId: string; userName: string }>(
      `/api/accounts/me/claim/${userId}`,
      { method: 'POST', body: JSON.stringify({ password }) },
      true,
    );
  },

  promoteToAdmin: (accountId: string): Promise<{ account: Account }> => {
    return fetchApi<{ account: Account }>(`/api/accounts/${accountId}/promote`, {
      method: 'POST',
    }, true);
  },
  getAll: (): Promise<AccountsResponse> => {
    return fetchApi<AccountsResponse>('/api/accounts', {}, true);
  },
  setRole: (accountId: string, role: 'admin' | 'account_owner'): Promise<{ account: Account }> => {
    return fetchApi<{ account: Account }>(`/api/accounts/${accountId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }, true);
  },
  setStatus: (accountId: string, status: 'active' | 'deactivated'): Promise<{ account: Account }> => {
    return fetchApi<{ account: Account }>(`/api/accounts/${accountId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }, true);
  },
  resetPassword: (accountId: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    return fetchApi<{ success: boolean; message: string }>(`/api/accounts/${accountId}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ newPassword }),
    }, true);
  },
  forceLogout: (accountId: string): Promise<{ success: boolean; message: string }> => {
    return fetchApi<{ success: boolean; message: string }>(`/api/accounts/${accountId}/sessions`, {
      method: 'DELETE',
    }, true);
  },
  /** Lists events owned by the account. Backs the delete pre-check
   *  and the transfer picker. */
  getOwnedEvents: (accountId: string): Promise<OwnedEventsResponse> => {
    return fetchApi<OwnedEventsResponse>(`/api/accounts/${accountId}/owned-events`, {}, true);
  },
  /** Hard-delete an account. Server enforces self-lock and the
   *  owned-events block (must transfer first). */
  deleteAccount: (accountId: string): Promise<{ success: boolean; message: string }> => {
    return fetchApi<{ success: boolean; message: string }>(`/api/accounts/${accountId}`, {
      method: 'DELETE',
    }, true);
  },
  /** Bulk-reassign every event owned by `sourceAccountId` to
   *  `targetAccountId`. Auto-promotes a `player` target to
   *  `account_owner` server-side. */
  transferEvents: (
    sourceAccountId: string,
    targetAccountId: string,
  ): Promise<{ transferred: number; message: string }> => {
    return fetchApi<{ transferred: number; message: string }>(
      `/api/accounts/${sourceAccountId}/transfer-events`,
      {
        method: 'POST',
        body: JSON.stringify({ targetAccountId }),
      },
      true,
    );
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
   * @param participantId - The participant's ID (must be owner)
   * @returns Success response
   * Requirements: 023-custom-thumbnail-upload 1.1
   */
  upload: async (gameId: string, file: File, participantId: string): Promise<{ success: boolean }> => {
    const url = `${getApiUrl()}/api/thumbnails/${gameId}`;
    const formData = new FormData();
    formData.append('thumbnail', file);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-participant-id': participantId,
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

// Events API (account-scoped event management)
export const eventsApi = {
  getAll: (): Promise<{ events: Event[] }> => {
    return fetchApi<{ events: Event[] }>('/api/events', {}, true);
  },

  getById: (id: string): Promise<{ event: Event }> => {
    return fetchApi<{ event: Event }>(`/api/events/${id}`, {}, true);
  },

  create: (data: CreateEventRequest): Promise<{ event: Event }> => {
    return fetchApi<{ event: Event }>('/api/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  },

  update: (id: string, data: UpdateEventRequest): Promise<{ event: Event }> => {
    return fetchApi<{ event: Event }>(`/api/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, true);
  },

  getBySlug: (slug: string): Promise<{ event: EventPublicInfo }> => {
    return fetchApi<{ event: EventPublicInfo }>(`/api/events/by-slug/${slug}`);
  },

  /** Counts of substantive data inside the event — backs the
   *  delete-confirmation modal. */
  getDeletionPreview: (id: string): Promise<{ preview: EventDeletionPreview }> => {
    return fetchApi<{ preview: EventDeletionPreview }>(`/api/events/${id}/deletion-preview`, {}, true);
  },

  /** Empty events are hard-deleted server-side; non-empty soft-delete
   *  with a 30-day undelete window. The response tells the UI which
   *  branch ran. */
  deleteEvent: (id: string): Promise<DeleteEventResponse> => {
    return fetchApi<DeleteEventResponse>(`/api/events/${id}`, { method: 'DELETE' }, true);
  },

  /** Restore a soft-deleted event. `slug` is the new slug to assign;
   *  null/undefined falls back to the original (pre-rename) slug.
   *  SLUG_TAKEN (409) is the signal to prompt the user to pick a
   *  different one. */
  undeleteEvent: (id: string, slug: string | null): Promise<{ event: Event }> => {
    return fetchApi<{ event: Event }>(`/api/events/${id}/undelete`, {
      method: 'POST',
      body: JSON.stringify({ slug }),
    }, true);
  },
};

export interface DonationStats {
  count: number;
  total: number;
  currency: string;
  activeSubscribers: number;
  since: string;
}

export const donationsApi = {
  getStats: (days = 30) =>
    fetchApi<DonationStats>(`/api/donations/stats?days=${days}`, {}, true),
};

// Export all APIs as a single object
export const api = {
  auth: authApi,
  participants: participantsApi,
  games: gamesApi,
  statistics: statisticsApi,
  bgg: bggApi,
  accounts: accountsApi,
  sessions: sessionsApi,
  thumbnails: thumbnailsApi,
  events: eventsApi,
  donations: donationsApi,
};

export default api;
