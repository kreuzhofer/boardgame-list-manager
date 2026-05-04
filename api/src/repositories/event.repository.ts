import { prisma } from '../db/prisma';
import type { EventEntity, EventStatus } from '../types/event';

export class EventRepository {
  /**
   * Returns all events for a given owner, INCLUDING soft-deleted ones.
   * Owner-scoped views (Meine Treffs) need to surface deleted events
   * with a purge countdown and undelete affordance, so we don't filter
   * here. Public/anon flows go through `findBySlug` / `findById` which
   * the service layer filters.
   */
  async findAll(ownerAccountId: string): Promise<EventEntity[]> {
    return prisma.event.findMany({
      where: { ownerAccountId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { participants: true, games: true } } },
    }) as unknown as Promise<EventEntity[]>;
  }

  async findById(id: string): Promise<EventEntity | null> {
    return prisma.event.findUnique({
      where: { id },
    }) as Promise<EventEntity | null>;
  }

  async findBySlug(slug: string): Promise<EventEntity | null> {
    return prisma.event.findUnique({
      where: { slug },
    }) as Promise<EventEntity | null>;
  }

  /**
   * Find soft-deleted events whose 30-day grace period has elapsed.
   * Backs `purgeExpiredDeletedEvents()` — both the boot sweep and the
   * lazy sweep at the start of `getEventsForOwner`.
   */
  async findExpiredDeleted(threshold: Date): Promise<Array<{ id: string }>> {
    return prisma.event.findMany({
      where: { deletedAt: { lt: threshold } },
      select: { id: true },
    });
  }

  async create(data: {
    name: string;
    slug: string;
    password: string;
    ownerAccountId: string;
    status?: EventStatus;
    description?: string | null;
    welcomeMessage?: string | null;
    startsAt?: Date | null;
    endsAt?: Date | null;
    location?: string | null;
    capacity?: number | null;
    notes?: string | null;
    fees?: string | null;
  }): Promise<EventEntity> {
    return prisma.event.create({ data }) as Promise<EventEntity>;
  }

  async update(id: string, data: {
    name?: string;
    slug?: string;
    password?: string;
    status?: EventStatus;
    description?: string | null;
    welcomeMessage?: string | null;
    startsAt?: Date | null;
    endsAt?: Date | null;
    location?: string | null;
    capacity?: number | null;
    notes?: string | null;
    fees?: string | null;
  }): Promise<EventEntity> {
    return prisma.event.update({
      where: { id },
      data,
    }) as Promise<EventEntity>;
  }

  async isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
    const existing = await prisma.event.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) return false;
    return existing.id !== excludeId;
  }
}

export const eventRepository = new EventRepository();
