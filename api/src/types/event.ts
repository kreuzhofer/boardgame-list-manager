export interface EventEntity {
  id: string;
  name: string;
  slug: string | null;
  password: string | null;
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
}

/** API response for event owners */
export interface EventResponse {
  id: string;
  name: string;
  slug: string;
  password: string | null;
  startsAt: string | null;
  endsAt: string | null;
  location: string | null;
  capacity: number | null;
  notes: string | null;
  fees: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Minimal info returned for slug lookup (no auth required) */
export interface EventPublicInfo {
  id: string;
  name: string;
  slug: string;
}

export interface CreateEventInput {
  name: string;
  slug?: string;
  password: string;
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
    startsAt: entity.startsAt?.toISOString() ?? null,
    endsAt: entity.endsAt?.toISOString() ?? null,
    location: entity.location,
    capacity: entity.capacity,
    notes: entity.notes,
    fees: entity.fees,
    isDefault: entity.isDefault,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

export function toEventPublicInfo(entity: EventEntity): EventPublicInfo {
  return {
    id: entity.id,
    name: entity.name,
    slug: entity.slug!,
  };
}
