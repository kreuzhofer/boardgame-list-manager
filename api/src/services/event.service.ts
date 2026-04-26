import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { prisma as defaultPrisma } from '../db/prisma';
import { eventRepository } from '../repositories/event.repository';
import type { EventEntity, EventResponse, EventPublicInfo, CreateEventInput, UpdateEventInput } from '../types/event';
import { toEventResponse, toEventPublicInfo, EVENT_STATUSES } from '../types/event';

export const RESERVED_SLUGS = [
  'login', 'register', 'profile', 'admin', 'print', 'statistics', 'events',
  'impressum', 'datenschutz',
  'api', 'health', 'favicon.ico', 'manifest.json', 'robots.txt',
];

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')    // non-alphanum → hyphen
    .replace(/-+/g, '-')            // collapse multiple hyphens
    .replace(/^-|-$/g, '');         // trim leading/trailing hyphens
}

export class EventService {
  private defaultEventId: string | null = null;

  constructor(private prisma: PrismaClient) {}

  verifyPassword(password: string, stored: string): boolean {
    return password === stored;
  }

  async ensureDefaultEvent(ownerAccountId: string): Promise<string> {
    const existing = await this.prisma.event.findFirst({
      where: { isDefault: true },
      select: { id: true, slug: true, password: true },
    });

    if (existing) {
      const updates: Record<string, unknown> = {};

      // Backfill slug for existing default event if missing
      if (!existing.slug) {
        updates.slug = await this.generateUniqueSlug(config.event.name);
      }

      // Reset password to configured value (handles migration from hashed passwords)
      if (existing.password !== config.auth.eventPassword) {
        updates.password = config.auth.eventPassword;
      }

      if (Object.keys(updates).length > 0) {
        await this.prisma.event.update({
          where: { id: existing.id },
          data: updates,
        });
      }

      this.defaultEventId = existing.id;
      return existing.id;
    }

    const slug = await this.generateUniqueSlug(config.event.name);

    const created = await this.prisma.event.create({
      data: {
        name: config.event.name,
        slug,
        password: config.auth.eventPassword,
        isDefault: true,
        ownerAccountId,
      },
      select: { id: true },
    });

    this.defaultEventId = created.id;
    return created.id;
  }

  async getDefaultEventId(): Promise<string> {
    if (this.defaultEventId) {
      return this.defaultEventId;
    }

    const existing = await this.prisma.event.findFirst({
      where: { isDefault: true },
      select: { id: true },
    });

    if (!existing) {
      throw new Error('Default event not initialized.');
    }

    this.defaultEventId = existing.id;
    return existing.id;
  }

  async getEventById(eventId: string) {
    return this.prisma.event.findUnique({
      where: { id: eventId },
    });
  }

  async verifyEventPassword(eventId: string, password: string): Promise<boolean> {
    const event = await this.getEventById(eventId);
    if (!event || !event.password) {
      return false;
    }
    return this.verifyPassword(password, event.password);
  }

  async backfillDefaultEvent(eventId: string): Promise<void> {
    await this.prisma.user.updateMany({
      where: { eventId: null },
      data: { eventId },
    });

    await this.prisma.game.updateMany({
      where: { eventId: null },
      data: { eventId },
    });

    await this.prisma.activityEvent.updateMany({
      where: { eventId: null },
      data: { eventId },
    });
  }

  async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
    const base = slugify(name);
    if (!base) {
      throw new Error('Cannot generate slug from empty name.');
    }

    let candidate = base;
    let suffix = 2;

    while (true) {
      const existing = await this.prisma.event.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });

      if (!existing || existing.id === excludeId) {
        return candidate;
      }

      candidate = `${base}-${suffix}`;
      suffix++;
    }
  }

  async backfillSlugs(): Promise<void> {
    const events = await this.prisma.event.findMany({
      where: { slug: null },
      select: { id: true, name: true },
    });

    for (const event of events) {
      const slug = await this.generateUniqueSlug(event.name);
      await this.prisma.event.update({
        where: { id: event.id },
        data: { slug },
      });
      console.log(`[Bootstrap] Assigned slug "${slug}" to event "${event.name}"`);
    }
  }

  validateSlug(slug: string): string | null {
    if (!slug || slug.length < 2) {
      return 'Slug muss mindestens 2 Zeichen lang sein.';
    }
    if (slug.length > 100) {
      return 'Slug darf maximal 100 Zeichen lang sein.';
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.';
    }
    if (RESERVED_SLUGS.includes(slug)) {
      return 'Dieser Slug ist reserviert und kann nicht verwendet werden.';
    }
    return null;
  }

  async getEventsForOwner(ownerAccountId: string): Promise<EventResponse[]> {
    const events = await eventRepository.findAll(ownerAccountId);
    return events.map(toEventResponse);
  }

  async getEventBySlug(slug: string): Promise<EventEntity | null> {
    return eventRepository.findBySlug(slug);
  }

  async getEventPublicInfo(slug: string): Promise<EventPublicInfo | null> {
    const event = await eventRepository.findBySlug(slug);
    if (!event) return null;
    return toEventPublicInfo(event);
  }

  async createEvent(ownerAccountId: string, input: CreateEventInput): Promise<EventResponse> {
    const slug = input.slug || await this.generateUniqueSlug(input.name);

    const slugError = this.validateSlug(slug);
    if (slugError) {
      throw new Error(slugError);
    }

    const taken = await eventRepository.isSlugTaken(slug);
    if (taken) {
      throw new Error('Dieser Slug ist bereits vergeben.');
    }

    if (input.status && !EVENT_STATUSES.includes(input.status)) {
      throw new Error('Ungültiger Status.');
    }

    const event = await eventRepository.create({
      name: input.name,
      slug,
      password: input.password,
      ownerAccountId,
      status: input.status,
      description: input.description ?? null,
      welcomeMessage: input.welcomeMessage ?? null,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      location: input.location ?? null,
      capacity: input.capacity ?? null,
      notes: input.notes ?? null,
      fees: input.fees ?? null,
    });

    return toEventResponse(event);
  }

  async updateEvent(eventId: string, ownerAccountId: string, input: UpdateEventInput): Promise<EventResponse> {
    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw new Error('Event nicht gefunden.');
    }
    if (event.ownerAccountId !== ownerAccountId) {
      throw new Error('Keine Berechtigung, dieses Event zu bearbeiten.');
    }

    const data: Record<string, unknown> = {};

    if (input.name !== undefined) data.name = input.name;
    if (input.location !== undefined) data.location = input.location;
    if (input.capacity !== undefined) data.capacity = input.capacity;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.fees !== undefined) data.fees = input.fees;
    if (input.description !== undefined) data.description = input.description;
    if (input.welcomeMessage !== undefined) data.welcomeMessage = input.welcomeMessage;
    if (input.startsAt !== undefined) data.startsAt = input.startsAt ? new Date(input.startsAt) : null;
    if (input.endsAt !== undefined) data.endsAt = input.endsAt ? new Date(input.endsAt) : null;

    if (input.status !== undefined) {
      if (!EVENT_STATUSES.includes(input.status)) {
        throw new Error('Ungültiger Status.');
      }
      data.status = input.status;
    }

    if (input.slug !== undefined) {
      const slugError = this.validateSlug(input.slug);
      if (slugError) {
        throw new Error(slugError);
      }
      const taken = await eventRepository.isSlugTaken(input.slug, eventId);
      if (taken) {
        throw new Error('Dieser Slug ist bereits vergeben.');
      }
      data.slug = input.slug;
    }

    if (input.password) {
      data.password = input.password;
    }

    const updated = await eventRepository.update(eventId, data);
    return toEventResponse(updated);
  }

  async getEventForOwner(eventId: string, ownerAccountId: string): Promise<EventResponse | null> {
    const event = await eventRepository.findById(eventId);
    if (!event || event.ownerAccountId !== ownerAccountId) {
      return null;
    }
    return toEventResponse(event);
  }
}

export const eventService = new EventService(defaultPrisma);
