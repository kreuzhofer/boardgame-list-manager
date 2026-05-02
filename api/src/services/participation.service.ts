import { Prisma, PrismaClient } from '@prisma/client';

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
   * Ensure a per-event `User` row exists for this account. Returns the
   * row so the verify route can hand the participantId back to the
   * frontend and skip the participant-pick modal.
   *
   * Resolution order:
   * 1. Existing User linked to (eventId, accountId) → return it.
   * 2. No existing row → create one with name = displayName / email
   *    local-part / fallback. On (eventId, name) conflict, append a
   *    numeric suffix and retry up to 5 times. After that we give up
   *    and return null — the frontend falls back to the modal so the
   *    user can pick something unique manually.
   */
  async ensureUserForAccount(args: {
    eventId: string;
    accountId: string;
    displayName: string | null;
    email: string;
  }): Promise<{ id: string; name: string } | null> {
    const existing = await this.prisma.user.findFirst({
      where: { eventId: args.eventId, accountId: args.accountId },
      select: { id: true, name: true },
    });
    if (existing) return existing;

    const localPart = args.email.split('@')[0] ?? '';
    const baseRaw = (args.displayName ?? localPart ?? 'Gast').trim() || 'Gast';
    // User.name is VARCHAR(30); reserve 5 chars for " (NN)" suffix.
    const baseTrimmed = baseRaw.slice(0, 25);

    for (let attempt = 0; attempt < 5; attempt++) {
      const name = attempt === 0 ? baseTrimmed : `${baseTrimmed} (${attempt + 1})`;
      try {
        const created = await this.prisma.user.create({
          data: {
            eventId: args.eventId,
            accountId: args.accountId,
            name: name.slice(0, 30),
          },
          select: { id: true, name: true },
        });
        return created;
      } catch (err) {
        // P2002 = Prisma unique-constraint violation. Could be either
        // the (event_id, name) conflict (try a suffix) or the
        // (event_id, account_id) conflict (someone else just created
        // the row in parallel — re-fetch and return).
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          const target = (err.meta?.target as string[] | undefined) ?? [];
          if (target.includes('account_id')) {
            const refetch = await this.prisma.user.findFirst({
              where: { eventId: args.eventId, accountId: args.accountId },
              select: { id: true, name: true },
            });
            if (refetch) return refetch;
          }
          // Otherwise it's the name conflict — fall through to the
          // next iteration with a numeric suffix.
          continue;
        }
        throw err;
      }
    }
    return null;
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
