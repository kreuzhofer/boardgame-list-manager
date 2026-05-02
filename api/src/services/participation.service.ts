import { PrismaClient } from '@prisma/client';

/**
 * Phase 2 of the identity migration: account-based event attendance.
 *
 * One row per (eventId, accountId). Calls are upsert-shaped because the
 * happy path is "user enters the event password again" — we want
 * idempotent participation creation, not duplicate rows.
 *
 * The legacy per-event `users` table is untouched by this service; the
 * old anonymous flow keeps writing there during the back-compat window.
 */
export class ParticipationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Ensure an EventParticipation row exists for the given (eventId,
   * accountId). If one already exists, return it unchanged. If not,
   * create one with the given displayName / role / inviter.
   */
  async ensureParticipation(args: {
    eventId: string;
    accountId: string;
    displayName?: string | null;
    role?: 'attendee' | 'co-host';
    invitedById?: string | null;
  }) {
    return this.prisma.eventParticipation.upsert({
      where: {
        eventId_accountId: {
          eventId: args.eventId,
          accountId: args.accountId,
        },
      },
      create: {
        eventId: args.eventId,
        accountId: args.accountId,
        displayName: args.displayName ?? null,
        role: args.role ?? 'attendee',
        invitedById: args.invitedById ?? null,
      },
      // Don't clobber an existing row's overrides on re-verify; the
      // "I am here" signal alone shouldn't reset displayName / role.
      update: {},
    });
  }

  /**
   * List the events an account has joined, ordered by most-recent join.
   * Used for the "Meine Treffs" page.
   */
  async listForAccount(accountId: string) {
    return this.prisma.eventParticipation.findMany({
      where: { accountId },
      orderBy: { joinedAt: 'desc' },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            startsAt: true,
            endsAt: true,
            location: true,
          },
        },
      },
    });
  }

  /**
   * Update participation status (going / interested / declined / waitlist)
   * or display-name override. No-op if the row doesn't exist.
   */
  async updateStatus(args: {
    eventId: string;
    accountId: string;
    status?: 'going' | 'interested' | 'declined' | 'waitlist';
    displayName?: string | null;
  }) {
    return this.prisma.eventParticipation.update({
      where: {
        eventId_accountId: {
          eventId: args.eventId,
          accountId: args.accountId,
        },
      },
      data: {
        ...(args.status !== undefined ? { status: args.status } : {}),
        ...(args.displayName !== undefined ? { displayName: args.displayName } : {}),
      },
    });
  }
}
