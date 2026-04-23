import { Request } from 'express';
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
