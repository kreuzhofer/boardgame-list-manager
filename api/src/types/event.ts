export type EventStatus = 'planning' | 'active' | 'archived';

export const EVENT_STATUSES: EventStatus[] = ['planning', 'active', 'archived'];

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
