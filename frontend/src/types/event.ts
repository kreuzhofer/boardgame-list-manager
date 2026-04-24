export interface Event {
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
  participantCount: number;
  gameCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EventPublicInfo {
  id: string;
  name: string;
  slug: string;
}

export interface CreateEventRequest {
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

export interface UpdateEventRequest {
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
