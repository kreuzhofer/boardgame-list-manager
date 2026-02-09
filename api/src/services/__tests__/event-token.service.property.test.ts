import * as fc from 'fast-check';
import jwt from 'jsonwebtoken';
import { EventTokenService } from '../event-token.service';

const service = new EventTokenService();

describe('EventTokenService Property Tests', () => {
  describe('Feature: event-auth-jwt, Property 1: EventTokenService round-trip', () => {
    /**
     * **Validates: Requirements 1.2**
     * For any valid eventId string, signing it with EventTokenService.sign(eventId)
     * and then verifying the resulting token with EventTokenService.verify(token)
     * should return a payload where payload.eventId === eventId and payload.type === 'event'.
     */
    it('sign then verify returns same eventId and type "event"', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (eventId) => {
            const token = service.sign(eventId);
            const payload = service.verify(token);

            expect(payload).not.toBeNull();
            expect(payload!.eventId).toBe(eventId);
            expect(payload!.type).toBe('event');
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Feature: event-auth-jwt, Property 2: Token expiry matches configuration', () => {
    /**
     * **Validates: Requirements 2.3**
     * For any eventId, the token produced by EventTokenService.sign(eventId)
     * should contain an exp claim that is approximately equal to iat plus
     * the configured EVENT_TOKEN_EXPIRY duration (default 7 days),
     * within a tolerance of 2 seconds.
     */
    it('token exp ≈ iat + configured duration (default 7 days)', () => {
      const SEVEN_DAYS_IN_SECONDS = 604800;

      fc.assert(
        fc.property(
          fc.uuid(),
          (eventId) => {
            const token = service.sign(eventId);
            const decoded = jwt.decode(token) as {
              eventId: string;
              type: string;
              iat: number;
              exp: number;
            };

            expect(decoded).not.toBeNull();
            expect(decoded.iat).toBeDefined();
            expect(decoded.exp).toBeDefined();

            const actualDuration = decoded.exp - decoded.iat;
            const tolerance = 2;

            expect(Math.abs(actualDuration - SEVEN_DAYS_IN_SECONDS)).toBeLessThanOrEqual(tolerance);
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});
