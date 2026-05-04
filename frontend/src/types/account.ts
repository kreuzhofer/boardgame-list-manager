export interface Account {
  id: string;
  email: string;
  role: 'account_owner' | 'admin';
  status: 'active' | 'deactivated' | 'unverified';
  /** Phase 2: default per-event display name. Null = use email local-part. */
  displayName: string | null;
  createdAt: string;
}

export interface Session {
  id: string;
  createdAt: string;
  lastUsedAt: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  isCurrent: boolean;
}

export interface LoginResponse {
  token: string;
  account: Account;
}

export interface RegisterResponse {
  account: Account;
  message: string;
}

/**
 * Admin accounts-list row. The `ownedEventsCount` lets the admin
 * table decide locally whether the "Löschen" button is available
 * (delete is blocked when count > 0) or "Treffs übertragen" should
 * be surfaced (count > 0).
 */
export interface AdminAccountRow extends Account {
  ownedEventsCount: number;
}

export interface AccountsResponse {
  accounts: AdminAccountRow[];
}

/**
 * Minimal event shape returned by GET /api/accounts/:id/owned-events.
 * Used by the delete pre-check and the transfer picker — no need for
 * the full EventResponse here.
 */
export interface OwnedEventLite {
  id: string;
  name: string;
  slug: string | null;
  status: string;
}

export interface OwnedEventsResponse {
  events: OwnedEventLite[];
}

export interface ApiError {
  error: string;
  message: string;
}

export interface Participation {
  id: string;
  eventId: string;
  displayName: string | null;
  role: 'attendee' | 'co-host';
  status: 'going' | 'interested' | 'declined' | 'waitlist';
  joinedAt: string;
  event: {
    id: string;
    name: string;
    slug: string | null;
    status: 'planning' | 'active' | 'archived';
    startsAt: string | null;
    endsAt: string | null;
    location: string | null;
  } | null;
}

export interface ClaimCandidate {
  id: string;
  name: string;
  slug: string | null;
  status: 'planning' | 'active' | 'archived';
  startsAt: string | null;
  endsAt: string | null;
  location: string | null;
  unclaimedCount: number;
}

export interface ClaimableUser {
  userId: string;
  displayName: string;
  brought: { id: string; name: string }[];
  played: { id: string; name: string }[];
  lastActivityAt: string | null;
}
