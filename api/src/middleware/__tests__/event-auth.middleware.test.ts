import { describe, it, expect, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { requireEventAuth } from '../event-auth.middleware';

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

describe('requireEventAuth', () => {
  it('returns 401 when no Authorization header is present', () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = jest.fn() as unknown as NextFunction;

    requireEventAuth(req as Request, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'INVALID_EVENT_TOKEN',
      message: 'Event token required',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 with expired message when token is expired', () => {
    const token = jwt.sign(
      { eventId: 'evt-123', type: 'event' },
      config.jwt.secret,
      { expiresIn: '-1s' }
    );
    const req = createMockReq({ authorization: `Bearer ${token}` });
    const res = createMockRes();
    const next = jest.fn() as unknown as NextFunction;

    requireEventAuth(req as Request, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'INVALID_EVENT_TOKEN',
      message: 'Event token expired',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when an account token (wrong type) is presented', () => {
    const token = jwt.sign(
      { accountId: 'acc-123', sessionId: 'sess-123', type: 'account' },
      config.jwt.secret,
      { expiresIn: '1h' }
    );
    const req = createMockReq({ authorization: `Bearer ${token}` });
    const res = createMockRes();
    const next = jest.fn() as unknown as NextFunction;

    requireEventAuth(req as Request, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'INVALID_EVENT_TOKEN',
      message: 'Invalid event token',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
