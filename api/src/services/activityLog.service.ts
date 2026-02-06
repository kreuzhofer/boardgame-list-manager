import { prisma } from '../db/prisma';
import type { ActivityEventType, Prisma } from '@prisma/client';

interface ActivityLogEventInput {
  actorParticipantId: string;
  eventType: ActivityEventType;
  gameId?: string;
  eventId?: string;
  metadata?: Prisma.InputJsonValue;
}

export class ActivityLogService {
  async logEvent(event: ActivityLogEventInput): Promise<void> {
    try {
      await prisma.activityEvent.create({
        data: {
          actorUserId: event.actorParticipantId,
          eventType: event.eventType,
          gameId: event.gameId ?? null,
          eventId: event.eventId ?? null,
          metadata: event.metadata ?? undefined,
        },
      });
    } catch (error) {
      console.error('[ActivityLogService] Failed to log activity event:', error);
    }
  }
}

export const activityLogService = new ActivityLogService();
