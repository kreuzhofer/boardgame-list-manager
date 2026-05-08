export type EventStatus = 'planning' | 'active' | 'archived';

export const EVENT_STATUSES: EventStatus[] = ['planning', 'active', 'archived'];

/**
 * Soft-deleted events live in the DB for this many days before
 * `purgeExpiredDeletedEvents()` removes them for good. The owner
 * sees the countdown in their "Meine Treffs" list and can undelete
 * any time before the deadline.
 */
export const PURGE_AFTER_DAYS = 30;

export interface EventEntity {
  id: string;
  name: string;
  slug: string | null;
  password: string | null;
  status: EventStatus;
  description: string | null;
  welcomeMessage: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  location: string | null;
  capacity: number | null;
  notes: string | null;
  fees: string | null;
  isDefault: boolean;
  ownerAccountId: string;
  /** Null = live event. Non-null marks soft-deleted; purges after PURGE_AFTER_DAYS. */
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { participants: number; games: number };
}

/** API response for event owners */
export interface EventResponse {
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
   * the event was soft-deleted; null for live events. `purgeAt` is
   * derived as `deletedAt + PURGE_AFTER_DAYS` and tells the UI when
   * the event will be hard-deleted unless undeleted first.
   */
  deletedAt: string | null;
  purgeAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Public info returned for slug lookup (no auth required) — safe for landing/header */
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

export interface CreateEventInput {
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

export interface UpdateEventInput {
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

export function toEventResponse(entity: EventEntity): EventResponse {
  const deletedAt = entity.deletedAt ?? null;
  const purgeAt = deletedAt
    ? new Date(deletedAt.getTime() + PURGE_AFTER_DAYS * 24 * 60 * 60 * 1000)
    : null;
  return {
    id: entity.id,
    name: entity.name,
    slug: entity.slug!,
    password: entity.password,
    status: entity.status,
    description: entity.description,
    welcomeMessage: entity.welcomeMessage,
    startsAt: entity.startsAt?.toISOString() ?? null,
    endsAt: entity.endsAt?.toISOString() ?? null,
    location: entity.location,
    capacity: entity.capacity,
    notes: entity.notes,
    fees: entity.fees,
    isDefault: entity.isDefault,
    participantCount: entity._count?.participants ?? 0,
    gameCount: entity._count?.games ?? 0,
    deletedAt: deletedAt ? deletedAt.toISOString() : null,
    purgeAt: purgeAt ? purgeAt.toISOString() : null,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

export function toEventPublicInfo(entity: EventEntity): EventPublicInfo {
  return {
    id: entity.id,
    name: entity.name,
    slug: entity.slug!,
    status: entity.status,
    ownerAccountId: entity.ownerAccountId,
    description: entity.description,
    welcomeMessage: entity.welcomeMessage,
    startsAt: entity.startsAt?.toISOString() ?? null,
    endsAt: entity.endsAt?.toISOString() ?? null,
    location: entity.location,
  };
}
