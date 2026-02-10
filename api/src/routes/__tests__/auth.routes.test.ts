/**
 * Integration tests for Auth routes (POST /api/auth/verify)
 *
 * Feature: event-auth-jwt
 * Requirements: 1.1, 1.3, 1.4, 7.1, 7.2
 */

import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import * as fc from 'fast-check';

// Mock EventService — control verifyEventPassword return value
const mockVerifyEventPassword = jest.fn();
jest.mock('../../services/event.service', () => ({
  EventService: jest.fn().mockImplementation(() => ({
    verifyEventPassword: mockVerifyEventPassword,
  })),
}));

// Mock resolveEventId to avoid DB access
jest.mock('../../middleware/event.middleware', () => ({
  resolveEventId: jest.fn().mockResolvedValue('test-event-id'),
}));

// Do NOT mock event-token.service — we want real token signing

import authRoutes from '../auth.routes';

describe('Auth Routes - POST /api/auth/verify', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Feature: event-auth-jwt, Property 8: Verify endpoint backward compatibility', () => {
    /**
     * **Validates: Requirements 1.1, 7.1, 7.2**
     * For any valid event password, the response from POST /api/auth/verify
     * should contain both a success: true boolean field and a token string field
     * that is a decodable JWT containing eventId and type: 'event' claims.
     */
    it('response contains success: true and a decodable JWT token', async () => {
      mockVerifyEventPassword.mockResolvedValue(true);

      await fc.assert(
        fc.asyncProperty(
          fc.constant('correct-password'),
          async (password) => {
            const response = await request(app)
              .post('/api/auth/verify')
              .send({ password })
              .expect(200);

            // Requirement 7.1: success boolean field present
            expect(response.body.success).toBe(true);

            // Requirement 7.2: token field present
            expect(response.body.token).toBeDefined();
            expect(typeof response.body.token).toBe('string');

            // Requirement 1.1: token is a decodable JWT with correct claims
            const decoded = jwt.decode(response.body.token) as Record<string, unknown>;
            expect(decoded).not.toBeNull();
            expect(decoded.eventId).toBe('test-event-id');
            expect(decoded.type).toBe('event');
            expect(decoded.exp).toBeDefined();
            expect(decoded.iat).toBeDefined();
          }
        ),
        { numRuns: 3 }
      );
    });
  });

  describe('Error responses (Requirements 1.3, 1.4)', () => {
    it('invalid password returns 401 without token field', async () => {
      mockVerifyEventPassword.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/verify')
        .send({ password: 'wrong-password' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Falsches Passwort');
      expect(response.body.token).toBeUndefined();
    });

    it('missing password returns 400 without token field', async () => {
      const response = await request(app)
        .post('/api/auth/verify')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Bitte Passwort eingeben.');
      expect(response.body.token).toBeUndefined();
    });
  });
});
