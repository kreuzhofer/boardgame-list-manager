import { PrismaClient } from '@prisma/client';
import { eventService } from './event.service';
import { ParticipationService } from './participation.service';

/**
 * Legacy claim flow.
 *
 * Lets an account take over an unclaimed per-event `User` row from
 * before the identity migration. The account-mode signup created
 * `users.account_id`; legacy rows have `account_id IS NULL`.
 *
 * Two real-world signals gate the claim:
 *
 *   1. **Knowing the event password.** Only attendees of the legacy
 *      treff have it, so passing it proves the user was there. The
 *      password also gates *visibility* of the unclaimed names — the
 *      candidate list endpoint only reveals counts; names appear after
 *      a successful password verify.
 *   2. **Recognising your own games.** The unclaimed-users response
 *      embeds a compact preview (brought / played / last seen) so the
 *      user picks "Hans K." with high confidence ("yep, I brought
 *      Cascadia").
 *
 * The actual claim is a single atomic UPDATE so two parallel confirms
 * can't both succeed.
 */
export class ClaimService {
  private participationService: ParticipationService;

  constructor(private prisma: PrismaClient) {
    this.participationService = new ParticipationService(prisma);
  }

  /**
   * Events the account *could* claim a legacy User in. A candidate
   * event has:
   *   - at least one unclaimed User row (account_id IS NULL), and
   *   - no existing User row for this account (so we avoid the merge
   *     edge-case for now — if the account has joined the event in
   *     account-mode, the unique (event_id, account_id) constraint
   *     would also reject the claim).
   *
   * The returned shape includes only counts, not names — full names
   * are gated behind the event-password verify step.
   */
  async listClaimCandidates(accountId: string) {
    const eventsWithUnclaimed = await this.prisma.event.findMany({
      where: {
        participants: { some: { accountId: null } },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        startsAt: true,
        endsAt: true,
        location: true,
        _count: {
          select: { participants: { where: { accountId: null } } },
        },
      },
      orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
    });

    const myUserEventIds = new Set(
      (
        await this.prisma.user.findMany({
          where: { accountId },
          select: { eventId: true },
        })
      )
        .map((u) => u.eventId)
        .filter((id): id is string => !!id),
    );

    return eventsWithUnclaimed
      .filter((e) => !myUserEventIds.has(e.id))
      .map((e) => ({
        id: e.id,
        name: e.name,
        slug: e.slug,
        status: e.status,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        location: e.location,
        unclaimedCount: e._count.participants,
      }));
  }

  /**
   * Returns the unclaimed Users in `eventId` with compact previews,
   * IF the supplied event password matches. Wrong password → throws
   * `ClaimAuthError`. Hidden names + previews protect the privacy of
   * past attendees from anyone who didn't actually attend.
   *
   * Refuses for events where the account already has a User (merge
   * case — see class docstring).
   */
  async listUnclaimedWithPreviews(args: {
    accountId: string;
    eventId: string;
    eventPassword: string;
  }) {
    const passwordOk = await eventService.verifyEventPassword(
      args.eventId,
      args.eventPassword,
    );
    if (!passwordOk) {
      throw new ClaimAuthError('INVALID_PASSWORD', 'Falsches Kennwort.');
    }

    const accountAlreadyInEvent = await this.prisma.user.findFirst({
      where: { accountId: args.accountId, eventId: args.eventId },
      select: { id: true },
    });
    if (accountAlreadyInEvent) {
      throw new ClaimAuthError(
        'ALREADY_PARTICIPANT',
        'Du hast bereits eine Identität in diesem Treff. Bitte einen Admin kontaktieren.',
      );
    }

    const users = await this.prisma.user.findMany({
      where: { eventId: args.eventId, accountId: null },
      select: {
        id: true,
        name: true,
        bringers: {
          select: { game: { select: { id: true, name: true } } },
          orderBy: { addedAt: 'desc' },
          take: 50,
        },
        players: {
          select: { game: { select: { id: true, name: true } } },
          orderBy: { addedAt: 'desc' },
          take: 50,
        },
        activityEvents: {
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    return users.map((u) => ({
      userId: u.id,
      displayName: u.name,
      brought: u.bringers.map((b) => ({ id: b.game.id, name: b.game.name })),
      played: u.players.map((p) => ({ id: p.game.id, name: p.game.name })),
      lastActivityAt: u.activityEvents[0]?.createdAt ?? null,
    }));
  }

  /**
   * Atomic claim. Re-verifies the event password (the frontend has it
   * from the unlock step but we don't trust the client). Returns:
   *   { ok: true, eventId, userName } when the row was successfully linked.
   *   { ok: false, reason: 'already_claimed' } — race lost or someone got there first.
   *   { ok: false, reason: 'not_found' } — userId doesn't exist.
   *   { ok: false, reason: 'conflict' } — account already has a User in
   *     the same event (merge case — refused).
   *
   * Throws `ClaimAuthError` on wrong password.
   */
  async claim(args: {
    accountId: string;
    userId: string;
    eventPassword: string;
  }): Promise<
    | { ok: true; eventId: string; userName: string }
    | { ok: false; reason: 'not_found' | 'already_claimed' | 'conflict' }
  > {
    const user = await this.prisma.user.findUnique({
      where: { id: args.userId },
      select: { id: true, eventId: true, accountId: true, name: true },
    });
    if (!user) return { ok: false, reason: 'not_found' };
    if (user.accountId) return { ok: false, reason: 'already_claimed' };
    if (!user.eventId) return { ok: false, reason: 'not_found' };

    const passwordOk = await eventService.verifyEventPassword(
      user.eventId,
      args.eventPassword,
    );
    if (!passwordOk) {
      throw new ClaimAuthError('INVALID_PASSWORD', 'Falsches Kennwort.');
    }

    const existing = await this.prisma.user.findFirst({
      where: { accountId: args.accountId, eventId: user.eventId },
      select: { id: true },
    });
    if (existing) return { ok: false, reason: 'conflict' };

    const claimed = await this.prisma.user.updateMany({
      where: { id: args.userId, accountId: null },
      data: { accountId: args.accountId },
    });
    if (claimed.count === 0) {
      return { ok: false, reason: 'already_claimed' };
    }

    // Mirror the claim into EventParticipation so the event surfaces
    // in the user's "Meine Treffs" immediately. Failures here must
    // not back-out the claim — log and continue.
    try {
      await this.participationService.ensureParticipation({
        eventId: user.eventId,
        accountId: args.accountId,
        displayName: user.name,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[claim] participation upsert failed event=${user.eventId} account=${args.accountId}: ${msg}`,
      );
    }

    return { ok: true, eventId: user.eventId, userName: user.name };
  }
}

/**
 * Surfaced as a clean 400/401 by the route layer. Authorisation
 * failures (wrong password, account already participating) flow
 * through this rather than untyped throws so we can pick the right
 * status code without sniffing strings.
 */
export class ClaimAuthError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'ClaimAuthError';
  }
}
