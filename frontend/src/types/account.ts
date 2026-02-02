export interface Account {
  id: string;
  email: string;
  role: 'account_owner' | 'admin';
  status: 'active' | 'deactivated';
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

export interface ApiError {
  error: string;
  message: string;
}
