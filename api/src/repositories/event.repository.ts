import { prisma } from '../db/prisma';
import type { EventEntity, EventStatus } from '../types/event';

export class EventRepository {
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
