export type EventStatus = 'planning' | 'active' | 'archived';

export const EVENT_STATUSES: EventStatus[] = ['planning', 'active', 'archived'];

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  planning: 'Planung',
  active: 'Aktiv',
  archived: 'Archiviert',
};

export interface Event {
  id: string;
  name: string;
  slug: string;
  password: string | null;
  status: EventStatus;
  description: string | null;
  welcomeMessage: string | null;
  startsAt: string | null;
  endsAt: string | null;
  location: string | null;
  capacity: number | null;
  notes: string | null;
  fees: string | null;
  isDefault: boolean;
  participantCount: number;
  gameCount: number;
  /**
   * Soft-delete metadata. `deletedAt` is the ISO timestamp at which
   * the owner soft-deleted the event; null for live events. `purgeAt`
   * tells the UI when the row will be hard-deleted unless undeleted
   * first (deletedAt + 30 days).
   */
  deletedAt: string | null;
  purgeAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventDeletionPreview {
  eventId: string;
  name: string;
  gamesCount: number;
  participantsCount: number;
  bringersCount: number;
  playersCount: number;
  eventParticipationsCount: number;
  /**
   * `true` when the event has no games and no per-event users.
   * Empty events go through the single-confirm hard-delete path;
   * non-empty events show this preview and use soft-delete with
   * a 30-day undelete window.
   */
  isEmpty: boolean;
}

export interface DeleteEventResponse {
  success: boolean;
  kind: 'hard' | 'soft';
  deletedAt: string | null;
  purgeAt: string | null;
  renamedSlug: string | null;
  message: string;
}

export interface EventPublicInfo {
  id: string;
  name: string;
  slug: string;
  status: EventStatus;
  ownerAccountId: string;
  description: string | null;
  welcomeMessage: string | null;
  startsAt: string | null;
  endsAt: string | null;
  location: string | null;
}

export interface CreateEventRequest {
  name: string;
  slug?: string;
  password: string;
  status?: EventStatus;
  description?: string;
  welcomeMessage?: string;
  startsAt?: string;
  endsAt?: string;
  location?: string;
  capacity?: number;
  notes?: string;
  fees?: string;
}

export interface UpdateEventRequest {
  name?: string;
  slug?: string;
  password?: string;
  status?: EventStatus;
  description?: string | null;
  welcomeMessage?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  location?: string | null;
  capacity?: number | null;
  notes?: string | null;
  fees?: string | null;
}
