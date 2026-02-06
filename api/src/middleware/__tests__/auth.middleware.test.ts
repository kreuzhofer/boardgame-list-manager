import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { AccountErrorCodes, AccountErrorMessages, AccountResponse, TokenPayload } from '../../types/account';

// Mock SessionService
const mockValidateToken = jest.fn<() => Promise<TokenPayload | null>>();
jest.mock('../../services/session.service', () => ({
  SessionService: jest.fn().mockImplementation(() => ({
    validateToken: mockValidateToken,
  })),
}));

// Mock AccountService
const mockGetById = jest.fn<() => Promise<AccountResponse | null>>();
jest.mock('../../services/account.service', () => ({
  AccountService: jest.fn().mockImplementation(() => ({
    getById: mockGetById,
  })),
}));

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

import { requireAuth, requireAdmin, AuthenticatedRequest } from '../auth.middleware';

function createMockReq(headers: Record<string, string> = {}): Partial<Request> {
  return { headers };
}

function createMockRes() {
  const res = {
    status: jest.fn().mockReturnThis() as unknown as Response['status'],
    json: jest.fn().mockReturnThis() as unknown as Response['json'],
  };
  return res;
}

const validAccount: AccountResponse = {
  id: 'acc-123',
  email: 'test@example.com',
  role: 'account_owner',
  status: 'active',
  createdAt: new Date(),
};

const adminAccount: AccountResponse = {
  ...validAccount,
  id: 'admin-123',
  role: 'admin',
};

const deactivatedAccount: AccountResponse = {
  ...validAccount,
  id: 'deactivated-123',
  status: 'deactivated',
};

const validPayload: TokenPayload = { accountId: 'acc-123', sessionId: 'sess-123' };

describe('requireAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when no Authorization header is present', async () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = jest.fn() as unknown as NextFunction;

    await requireAuth(req as Request, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: AccountErrorCodes.INVALID_TOKEN,
      message: AccountErrorMessages.INVALID_TOKEN,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header does not start with Bearer', async () => {
    const req = createMockReq({ authorization: 'Basic some-token' });
    const res = createMockRes();
    const next = jest.fn() as unknown as NextFunction;

    await requireAuth(req as Request, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: AccountErrorCodes.INVALID_TOKEN,
      message: AccountErrorMessages.INVALID_TOKEN,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid (validateToken returns null)', async () => {
    mockValidateToken.mockResolvedValue(null);
    const req = createMockReq({ authorization: 'Bearer invalid-token' });
    const res = createMockRes();
    const next = jest.fn() as unknown as NextFunction;

    await requireAuth(req as Request, res as unknown as Response, next);

    expect(mockValidateToken).toHaveBeenCalledWith('invalid-token');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: AccountErrorCodes.INVALID_TOKEN,
      message: AccountErrorMessages.INVALID_TOKEN,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when account is not found (getById returns null)', async () => {
    mockValidateToken.mockResolvedValue(validPayload);
    mockGetById.mockResolvedValue(null);
    const req = createMockReq({ authorization: 'Bearer valid-token' });
    const res = createMockRes();
    const next = jest.fn() as unknown as NextFunction;

    await requireAuth(req as Request, res as unknown as Response, next);

    expect(mockGetById).toHaveBeenCalledWith('acc-123');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: AccountErrorCodes.ACCOUNT_NOT_FOUND,
      message: AccountErrorMessages.ACCOUNT_NOT_FOUND,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when account is deactivated', async () => {
    mockValidateToken.mockResolvedValue({ accountId: 'deactivated-123', sessionId: 'sess-456' });
    mockGetById.mockResolvedValue(deactivatedAccount);
    const req = createMockReq({ authorization: 'Bearer valid-token' });
    const res = createMockRes();
    const next = jest.fn() as unknown as NextFunction;

    await requireAuth(req as Request, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: AccountErrorCodes.ACCOUNT_DEACTIVATED,
      message: AccountErrorMessages.ACCOUNT_DEACTIVATED,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() and attaches account and sessionId for valid token', async () => {
    mockValidateToken.mockResolvedValue(validPayload);
    mockGetById.mockResolvedValue(validAccount);
    const req = createMockReq({ authorization: 'Bearer valid-token' });
    const res = createMockRes();
    const next = jest.fn() as unknown as NextFunction;

    await requireAuth(req as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalled();
    expect((req as AuthenticatedRequest).account).toEqual(validAccount);
    expect((req as AuthenticatedRequest).sessionId).toBe('sess-123');
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('requireAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when no account is attached to request', async () => {
    const req = createMockReq() as Partial<AuthenticatedRequest>;
    const res = createMockRes();
    const next = jest.fn() as unknown as NextFunction;

    await requireAdmin(req as Request, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: AccountErrorCodes.INVALID_TOKEN,
      message: AccountErrorMessages.INVALID_TOKEN,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when account role is not admin', async () => {
    const req = createMockReq() as Partial<AuthenticatedRequest>;
    (req as AuthenticatedRequest).account = validAccount;
    const res = createMockRes();
    const next = jest.fn() as unknown as NextFunction;

    await requireAdmin(req as Request, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: AccountErrorCodes.NOT_AUTHORIZED,
      message: AccountErrorMessages.NOT_AUTHORIZED,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when account role is admin', async () => {
    const req = createMockReq() as Partial<AuthenticatedRequest>;
    (req as AuthenticatedRequest).account = adminAccount;
    const res = createMockRes();
    const next = jest.fn() as unknown as NextFunction;

    await requireAdmin(req as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
