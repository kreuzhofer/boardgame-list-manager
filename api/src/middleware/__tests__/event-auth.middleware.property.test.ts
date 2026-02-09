import * as fc from 'fast-check';
import { Request, Response, NextFunction } from 'express';
import { EventTokenService } from '../../services/event-token.service';
import { requireEventAuth, EventAuthenticatedRequest } from '../event-auth.middleware';

const service = new EventTokenService();

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

describe('Event Auth Middleware Property Tests', () => {
  describe('Feature: event-auth-jwt, Property 3: Valid event token passes middleware', () => {
    /**
     * **Validates: Requirements 3.2**
     * For any valid event token (produced by EventTokenService.sign()),
     * when presented in an Authorization: Bearer <token> header,
     * the requireEventAuth middleware should call next() and attach
     * the correct eventId to the request object.
     */
    it('valid signed token calls next() with correct eventId', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (eventId) => {
            const token = service.sign(eventId);
            const req = createMockReq({ authorization: `Bearer ${token}` });
            const res = createMockRes();
            const next = jest.fn() as unknown as NextFunction;

            requireEventAuth(req as Request, res as unknown as Response, next);

            expect(next).toHaveBeenCalled();
            expect((req as EventAuthenticatedRequest).eventId).toBe(eventId);
            expect(res.status).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe('Feature: event-auth-jwt, Property 4: Malformed tokens rejected', () => {
    /**
     * **Validates: Requirements 3.4**
     * For any arbitrary string that is not a valid JWT signed with the
     * correct secret, the requireEventAuth middleware should return a
     * 401 response and not call next().
     */
    it('arbitrary non-JWT string returns 401 and does not call next()', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          (randomStr) => {
            const req = createMockReq({ authorization: `Bearer ${randomStr}` });
            const res = createMockRes();
            const next = jest.fn() as unknown as NextFunction;

            requireEventAuth(req as Request, res as unknown as Response, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
              expect.objectContaining({
                error: 'INVALID_EVENT_TOKEN',
              })
            );
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
