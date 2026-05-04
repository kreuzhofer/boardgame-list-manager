import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { prisma as defaultPrisma } from '../db/prisma';
import { eventRepository } from '../repositories/event.repository';
import type { EventEntity, EventResponse, EventPublicInfo, CreateEventInput, UpdateEventInput } from '../types/event';
import { toEventResponse, toEventPublicInfo, EVENT_STATUSES, PURGE_AFTER_DAYS } from '../types/event';

export const RESERVED_SLUGS = [
  'login', 'register', 'profile', 'admin', 'print', 'statistics', 'events',
  'impressum', 'datenschutz',
  'api', 'health', 'favicon.ico', 'manifest.json', 'robots.txt',
];

/**
 * Service-level errors with explicit codes + HTTP status, mirroring
 * `AccountError`. Existing event methods throw plain `Error` for
 * validation; the new delete/undelete flows use this richer type so
 * the route layer can map cleanly to status codes and the frontend
 * can branch on the code (e.g. SLUG_TAKEN to surface inline errors
 * in the undelete picker).
 */
export class EventError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'EventError';
  }
}

export const EventErrorCodes = {
  EVENT_NOT_FOUND: 'EVENT_NOT_FOUND',
  NOT_AUTHORIZED: 'NOT_AUTHORIZED',
  ALREADY_DELETED: 'ALREADY_DELETED',
  NOT_DELETED: 'NOT_DELETED',
  SLUG_TAKEN: 'SLUG_TAKEN',
  SLUG_INVALID: 'SLUG_INVALID',
  CANNOT_DELETE_DEFAULT: 'CANNOT_DELETE_DEFAULT',
} as const;

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

  /**
   * Public lookup by id. Soft-deleted events are hidden by default —
   * a participant landing on a soft-deleted event id (e.g. via a
   * stale `x-event-id` header) should see "not found", not the
   * about-to-purge ghost. Owner-side flows (delete/undelete) read
   * directly via `eventRepository.findById` to bypass this filter.
   */
  async getEventById(eventId: string, opts: { includeDeleted?: boolean } = {}) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) return null;
    if (!opts.includeDeleted && event.deletedAt) return null;
    return event;
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
    // Lazy purge sweep: every Meine-Treffs render gives us a chance to
    // reap events whose 30-day grace has elapsed. Cheap (indexed
    // deletedAt) and means the count the owner sees stays accurate
    // without a dedicated cron.
    await this.purgeExpiredDeletedEvents().catch((err) => {
      console.error('[EventService] Lazy purge failed:', err);
    });
    const events = await eventRepository.findAll(ownerAccountId);
    return events.map(toEventResponse);
  }

  /**
   * Public slug lookup. Soft-deleted events are hidden by default —
   * the rename to `<slug>-deleted[-N]` already frees the original
   * slug, but a hit on the renamed slug shouldn't surface the dead
   * event to the public anon flow either. Owner-side flows are
   * keyed by id and don't go through this path.
   */
  async getEventBySlug(slug: string, opts: { includeDeleted?: boolean } = {}): Promise<EventEntity | null> {
    const event = await eventRepository.findBySlug(slug);
    if (!event) return null;
    if (!opts.includeDeleted && event.deletedAt) return null;
    return event;
  }

  async getEventPublicInfo(slug: string): Promise<EventPublicInfo | null> {
    const event = await eventRepository.findBySlug(slug);
    if (!event || event.deletedAt) return null;
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

    // Auto-promote: a `player` account that creates an event becomes
    // an `account_owner` (organizer in the target naming) so they can
    // manage what they just made. updateMany guards the role to avoid
    // touching admins or accounts that are already organizers.
    await this.prisma.account.updateMany({
      where: { id: ownerAccountId, role: 'player' },
      data: { role: 'account_owner' },
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

  // ─── Soft-delete / undelete / purge ─────────────────────────────────

  /**
   * Counts of substantive data inside an event. Backs the
   * "show what's at stake" preview the modal renders before the
   * second confirmation.
   *
   * "Empty" for the single-confirm hard-delete path is defined as
   * `gamesCount === 0 && participantsCount === 0` — a per-event User
   * row may exist for the owner themselves with no game involvement,
   * which counts as "people have looked in", so we surface it.
   */
  async getDeletionPreview(
    eventId: string,
    callerAccountId: string,
  ): Promise<{
    eventId: string;
    name: string;
    gamesCount: number;
    participantsCount: number;
    bringersCount: number;
    playersCount: number;
    eventParticipationsCount: number;
    isEmpty: boolean;
  }> {
    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw new EventError(
        EventErrorCodes.EVENT_NOT_FOUND,
        'Treff nicht gefunden.',
        404,
      );
    }
    if (event.ownerAccountId !== callerAccountId) {
      throw new EventError(
        EventErrorCodes.NOT_AUTHORIZED,
        'Keine Berechtigung für diesen Treff.',
        403,
      );
    }

    const [gamesCount, participantsCount, bringersCount, playersCount, partCount] =
      await Promise.all([
        this.prisma.game.count({ where: { eventId } }),
        this.prisma.user.count({ where: { eventId } }),
        this.prisma.bringer.count({ where: { game: { eventId } } }),
        this.prisma.player.count({ where: { game: { eventId } } }),
        this.prisma.eventParticipation.count({ where: { eventId } }),
      ]);

    const isEmpty = gamesCount === 0 && participantsCount === 0;

    return {
      eventId,
      name: event.name,
      gamesCount,
      participantsCount,
      bringersCount,
      playersCount,
      eventParticipationsCount: partCount,
      isEmpty,
    };
  }

  /**
   * Hard-delete an event when it's empty, soft-delete otherwise.
   *
   * Soft delete:
   *  - Sets `deletedAt = now()`
   *  - Renames `slug` to `<original>-deleted`, falling back to
   *    `<original>-deleted2`, `-deleted3`, ... if a rename collides
   *    with another already-deleted (or live) event sharing the same
   *    rename. The original slug is freed for reuse immediately.
   *
   * Hard delete: removes the event row outright. Schema cascades take
   * care of Games / Players / Bringers / Users / Participations.
   *
   * The default event (used by the legacy anon flow) is not deletable
   * — that's a hard "keep it on" guarantee from CLAUDE.md.
   */
  async deleteEvent(
    eventId: string,
    callerAccountId: string,
  ): Promise<{ kind: 'hard' | 'soft'; deletedAt: Date | null; renamedSlug: string | null; purgeAt: Date | null }> {
    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw new EventError(
        EventErrorCodes.EVENT_NOT_FOUND,
        'Treff nicht gefunden.',
        404,
      );
    }
    if (event.ownerAccountId !== callerAccountId) {
      throw new EventError(
        EventErrorCodes.NOT_AUTHORIZED,
        'Keine Berechtigung für diesen Treff.',
        403,
      );
    }
    if (event.deletedAt) {
      throw new EventError(
        EventErrorCodes.ALREADY_DELETED,
        'Treff wurde bereits gelöscht.',
        409,
      );
    }
    if (event.isDefault) {
      throw new EventError(
        EventErrorCodes.CANNOT_DELETE_DEFAULT,
        'Der Standard-Treff kann nicht gelöscht werden.',
        400,
      );
    }

    // Use the same emptiness rule as the preview so the UI's "isEmpty"
    // signal matches the server's branching.
    const preview = await this.getDeletionPreview(eventId, callerAccountId);

    if (preview.isEmpty) {
      await this.prisma.event.delete({ where: { id: eventId } });
      return { kind: 'hard', deletedAt: null, renamedSlug: null, purgeAt: null };
    }

    // Soft delete — rename slug to free the original. We loop trying
    // `<base>-deleted`, `<base>-deleted2`, `<base>-deleted3`, ... up to
    // a sane upper bound. The unique constraint on slug means a race
    // could still produce a collision; we catch P2002 below and retry.
    const base = event.slug ?? event.id;
    const now = new Date();

    let updated: EventEntity | null = null;
    let lastErr: unknown = null;
    for (let n = 1; n <= 50 && !updated; n += 1) {
      const candidate = n === 1 ? `${base}-deleted` : `${base}-deleted${n}`;
      try {
        updated = (await this.prisma.event.update({
          where: { id: eventId },
          data: { slug: candidate, deletedAt: now },
        })) as unknown as EventEntity;
      } catch (e: unknown) {
        // P2002 = unique constraint violation; try next suffix
        if ((e as { code?: string }).code === 'P2002') {
          lastErr = e;
          continue;
        }
        throw e;
      }
    }
    if (!updated) {
      // Truly exhausted suffixes — surface the last error rather than
      // a misleading generic one. Operationally this is unreachable.
      throw lastErr instanceof Error ? lastErr : new Error('Slug-Suffix erschöpft.');
    }

    const purgeAt = new Date(now.getTime() + PURGE_AFTER_DAYS * 24 * 60 * 60 * 1000);
    return {
      kind: 'soft',
      deletedAt: now,
      renamedSlug: updated.slug,
      purgeAt,
    };
  }

  /**
   * Restore a soft-deleted event. The caller picks the slug to assign;
   * if it's null/empty we attempt the original (the part before the
   * `-deleted[-N]` suffix). The slug must be free at the moment of
   * undelete — the route surfaces SLUG_TAKEN to the modal so the user
   * can edit and retry.
   */
  async undeleteEvent(
    eventId: string,
    callerAccountId: string,
    requestedSlug: string | null | undefined,
  ): Promise<EventResponse> {
    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw new EventError(
        EventErrorCodes.EVENT_NOT_FOUND,
        'Treff nicht gefunden.',
        404,
      );
    }
    if (event.ownerAccountId !== callerAccountId) {
      throw new EventError(
        EventErrorCodes.NOT_AUTHORIZED,
        'Keine Berechtigung für diesen Treff.',
        403,
      );
    }
    if (!event.deletedAt) {
      throw new EventError(
        EventErrorCodes.NOT_DELETED,
        'Treff ist nicht gelöscht.',
        409,
      );
    }

    // Derive original slug by stripping the `-deleted[-N]` suffix.
    const currentSlug = event.slug ?? '';
    const stripped = currentSlug.replace(/-deleted\d*$/, '');
    const targetSlug = (requestedSlug && requestedSlug.trim()) || stripped;

    if (!targetSlug) {
      throw new EventError(
        EventErrorCodes.SLUG_INVALID,
        'Bitte einen gültigen Slug angeben.',
        400,
      );
    }

    const slugError = this.validateSlug(targetSlug);
    if (slugError) {
      throw new EventError(EventErrorCodes.SLUG_INVALID, slugError, 400);
    }

    const taken = await eventRepository.isSlugTaken(targetSlug, eventId);
    if (taken) {
      throw new EventError(
        EventErrorCodes.SLUG_TAKEN,
        `Slug "${targetSlug}" ist bereits vergeben.`,
        409,
      );
    }

    const restored = await this.prisma.event.update({
      where: { id: eventId },
      data: { slug: targetSlug, deletedAt: null },
    });
    return toEventResponse(restored as unknown as EventEntity);
  }

  /**
   * Hard-delete every event whose deletedAt is older than PURGE_AFTER_DAYS.
   * Called once at API boot and lazily at the start of
   * `getEventsForOwner` so the owner sees a fresh list. Idempotent.
   */
  async purgeExpiredDeletedEvents(): Promise<{ purged: number }> {
    const threshold = new Date(
      Date.now() - PURGE_AFTER_DAYS * 24 * 60 * 60 * 1000,
    );
    const expired = await eventRepository.findExpiredDeleted(threshold);
    if (expired.length === 0) {
      return { purged: 0 };
    }
    const result = await this.prisma.event.deleteMany({
      where: { id: { in: expired.map((e) => e.id) } },
    });
    if (result.count > 0) {
      console.log(`[EventService] Purged ${result.count} expired soft-deleted events`);
    }
    return { purged: result.count };
  }
}

export const eventService = new EventService(defaultPrisma);
