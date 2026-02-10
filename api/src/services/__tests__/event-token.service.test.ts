import { describe, it, expect } from '@jest/globals';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { EventTokenService } from '../event-token.service';
import { config } from '../../config';

const service = new EventTokenService();

describe('EventTokenService', () => {
  describe('verify() rejects non-event tokens', () => {
    /**
     * An account token (type: 'account') signed with the same secret
     * must be rejected by verify() because the type claim does not match 'event'.
     * Validates: Requirements 3.4
     */
    it('should return null for a token with type "account"', () => {
      const accountToken = jwt.sign(
        { accountId: 'some-account-id', type: 'account' },
        config.jwt.secret,
        { expiresIn: '1h' } as SignOptions
      );

      const result = service.verify(accountToken);
      expect(result).toBeNull();
    });
  });

  describe('verify() rejects expired tokens', () => {
    /**
     * A token that has already expired must return null from verify().
     * Validates: Requirements 3.3
     */
    it('should return null for an expired event token', () => {
      // Sign a token that expires immediately (in the past)
      const expiredToken = jwt.sign(
        { eventId: 'test-event-id', type: 'event' },
        config.jwt.secret,
        { expiresIn: '-1s' } as SignOptions
      );

      const result = service.verify(expiredToken);
      expect(result).toBeNull();
    });
  });

  describe('sign() default expiry', () => {
    /**
     * When EVENT_TOKEN_EXPIRY is not set, the default expiry should be 7 days.
     * We verify this by signing a token and checking that exp - iat === 604800 (7 days in seconds).
     * Validates: Requirements 2.2
     */
    it('should produce a token with 7-day expiry by default', () => {
      const SEVEN_DAYS_IN_SECONDS = 604800;

      const token = service.sign('test-event-id');
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
      // Allow 2-second tolerance for timing
      expect(Math.abs(actualDuration - SEVEN_DAYS_IN_SECONDS)).toBeLessThanOrEqual(2);
    });
  });
});
