import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config';

export interface EventTokenPayload {
  eventId: string;
  type: 'event';
}

export class EventTokenService {
  /**
   * Sign a JWT for event authentication.
   * Includes { eventId, type: 'event' } claims, signed with JWT_SECRET,
   * expiring per EVENT_TOKEN_EXPIRY config (default '7d').
   */
  sign(eventId: string): string {
    const payload: EventTokenPayload = {
      eventId,
      type: 'event',
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.eventToken.expiresIn,
    } as SignOptions);
  }

  /**
   * Verify an event JWT token.
   * Checks signature, expiry, and type === 'event' claim.
   * Returns decoded payload or null on any failure.
   */
  verify(token: string): EventTokenPayload | null {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as Record<string, unknown>;

      if (decoded.type !== 'event') {
        return null;
      }

      return {
        eventId: decoded.eventId as string,
        type: 'event',
      };
    } catch {
      return null;
    }
  }
}

export const eventTokenService = new EventTokenService();
