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
  createdAt: string;
  updatedAt: string;
}

export interface EventPublicInfo {
  id: string;
  name: string;
  slug: string;
  status: EventStatus;
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
