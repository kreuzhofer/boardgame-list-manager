export interface Account {
  id: string;
  email: string;
  role: 'account_owner' | 'admin';
  status: 'active' | 'deactivated' | 'unverified';
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

export interface AccountsResponse {
  accounts: Account[];
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
