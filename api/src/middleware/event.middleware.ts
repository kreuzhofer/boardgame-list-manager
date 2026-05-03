import { Request, Response, NextFunction } from 'express';
import { eventService } from '../services/event.service';
import { eventTokenService } from '../services/event-token.service';

export async function resolveEventId(req: Request): Promise<string> {
  // 1. Explicit event ID from header or query
  const headerValue = req.headers['x-event-id'];
  const eventIdFromHeader = typeof headerValue === 'string' ? headerValue : undefined;
  const eventIdFromQuery = typeof req.query.eventId === 'string' ? req.query.eventId : undefined;
  const eventId = eventIdFromHeader || eventIdFromQuery;

  if (eventId) {
    return eventId;
  }

  // 2. Slug-based resolution from header
  const slugHeader = req.headers['x-event-slug'];
  const slug = typeof slugHeader === 'string' ? slugHeader : undefined;

  if (slug) {
    const event = await eventService.getEventBySlug(slug);
    if (event) {
      return event.id;
    }
  }

  // 3. Extract eventId from event JWT token
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = eventTokenService.verify(token);
    if (payload?.eventId) {
      return payload.eventId;
    }
  }

  // 4. Fall back to default event
  return eventService.getDefaultEventId();
}

/**
 * Reject mutating requests when the resolved event is archived.
 *
 * Archived events are read-only — game lists, player rosters, the
 * statistics page all stay visible, but no new edits can be made.
 * The frontend hides the relevant UI; this middleware is the safety
 * net for stale clients and direct API calls.
 *
 * Apply to write routes (POST / PATCH / PUT / DELETE) inside the
 * game / participant / thumbnail routers. Read routes are unchanged.
 */
export async function requireEditableEvent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const eventId = await resolveEventId(req);
    const event = await eventService.getEventById(eventId);
    if (event && event.status === 'archived') {
      res.status(403).json({
        error: {
          code: 'EVENT_ARCHIVED',
          message:
            'Dieser Treff ist archiviert. Änderungen sind nicht mehr möglich.',
        },
      });
      return;
    }
    next();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[requireEditableEvent] resolution failed: ${msg}`);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ein Fehler ist aufgetreten.',
      },
    });
  }
}
