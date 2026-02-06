export type AccountRole = 'account_owner' | 'admin';
export type AccountStatus = 'active' | 'deactivated';

export interface Account {
  id: string;
  email: string;
  role: AccountRole;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountWithPassword extends Account {
  passwordHash: string;
}

export interface Session {
  id: string;
  accountId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: Date;
  lastUsedAt: Date;
}

export interface CreateAccountInput {
  email: string;
  password: string;
}

export interface AccountResponse {
  id: string;
  email: string;
  role: AccountRole;
  status: AccountStatus;
  createdAt: Date;
}

export interface TokenPayload {
  accountId: string;
  sessionId: string;
}

// Error codes for account operations
export const AccountErrorCodes = {
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  INVALID_EMAIL: 'INVALID_EMAIL',
  PASSWORD_TOO_SHORT: 'PASSWORD_TOO_SHORT',
  PASSWORD_MISSING_LETTER: 'PASSWORD_MISSING_LETTER',
  PASSWORD_MISSING_NUMBER: 'PASSWORD_MISSING_NUMBER',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_DEACTIVATED: 'ACCOUNT_DEACTIVATED',
  WRONG_PASSWORD: 'WRONG_PASSWORD',
  INVALID_TOKEN: 'INVALID_TOKEN',
  NOT_AUTHORIZED: 'NOT_AUTHORIZED',
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SELF_DEACTIVATION: 'SELF_DEACTIVATION',
} as const;

export type AccountErrorCode = typeof AccountErrorCodes[keyof typeof AccountErrorCodes];

// German error messages
export const AccountErrorMessages: Record<AccountErrorCode, string> = {
  EMAIL_EXISTS: 'Diese E-Mail-Adresse ist bereits registriert.',
  INVALID_EMAIL: 'Bitte eine gültige E-Mail-Adresse eingeben.',
  PASSWORD_TOO_SHORT: 'Das Passwort muss mindestens 8 Zeichen lang sein.',
  PASSWORD_MISSING_LETTER: 'Das Passwort muss mindestens einen Buchstaben enthalten.',
  PASSWORD_MISSING_NUMBER: 'Das Passwort muss mindestens eine Zahl enthalten.',
  INVALID_CREDENTIALS: 'E-Mail oder Passwort ist falsch.',
  ACCOUNT_DEACTIVATED: 'Dieses Konto wurde deaktiviert.',
  WRONG_PASSWORD: 'Das aktuelle Passwort ist falsch.',
  INVALID_TOKEN: 'Sitzung abgelaufen. Bitte erneut anmelden.',
  NOT_AUTHORIZED: 'Keine Berechtigung für diese Aktion.',
  ACCOUNT_NOT_FOUND: 'Konto nicht gefunden.',
  SESSION_NOT_FOUND: 'Sitzung nicht gefunden.',
  SELF_DEACTIVATION: 'Administratoren können ihr eigenes Konto nicht deaktivieren.',
};
