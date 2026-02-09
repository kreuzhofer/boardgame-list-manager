import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { eventTokenService } from '../services/event-token.service';
import { config } from '../config';

export interface EventAuthenticatedRequest extends Request {
  eventId: string;
}

/**
 * Middleware that requires a valid event JWT token.
 * Extracts Bearer token from Authorization header,
 * verifies it via EventTokenService, and attaches eventId to the request.
 */
export function requireEventAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'INVALID_EVENT_TOKEN',
      message: 'Event token required',
    });
    return;
  }

  const token = authHeader.substring(7);
  const payload = eventTokenService.verify(token);

  if (!payload) {
    // Distinguish expired from other failures for the error message
    let message = 'Invalid event token';
    try {
      jwt.verify(token, config.jwt.secret);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        message = 'Event token expired';
      }
    }

    res.status(401).json({
      error: 'INVALID_EVENT_TOKEN',
      message,
    });
    return;
  }

  (req as EventAuthenticatedRequest).eventId = payload.eventId;
  next();
}
