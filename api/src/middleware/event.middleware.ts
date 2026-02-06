import { Request } from 'express';
import { prisma } from '../db/prisma';
import { EventService } from '../services/event.service';

const eventService = new EventService(prisma);

export async function resolveEventId(req: Request): Promise<string> {
  const headerValue = req.headers['x-event-id'];
  const eventIdFromHeader = typeof headerValue === 'string' ? headerValue : undefined;
  const eventIdFromQuery = typeof req.query.eventId === 'string' ? req.query.eventId : undefined;
  const eventId = eventIdFromHeader || eventIdFromQuery;

  if (eventId) {
    return eventId;
  }

  return eventService.getDefaultEventId();
}
