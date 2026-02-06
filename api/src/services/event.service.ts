import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const BCRYPT_COST_FACTOR = 12;

export class EventService {
  private defaultEventId: string | null = null;

  constructor(private prisma: PrismaClient) {}

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_COST_FACTOR);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async ensureDefaultEvent(ownerAccountId: string): Promise<string> {
    const existing = await this.prisma.event.findFirst({
      where: { isDefault: true },
      select: { id: true },
    });

    if (existing) {
      this.defaultEventId = existing.id;
      return existing.id;
    }

    const passwordHash = await this.hashPassword(config.auth.eventPassword);

    const created = await this.prisma.event.create({
      data: {
        name: config.event.name,
        passwordHash,
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
    if (!event) {
      return false;
    }
    return this.verifyPassword(password, event.passwordHash);
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
}
