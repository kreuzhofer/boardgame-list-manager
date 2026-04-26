import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';

// ───────────────────────────────────────────────────────────────────
// Buy Me a Coffee webhook payload shapes
// ───────────────────────────────────────────────────────────────────

export interface BmcWebhookEnvelope {
  type: string;
  live_mode: boolean;
  attempt?: number;
  created?: number;
  event_id?: number;
  data: BmcDonationData | BmcSubscriptionData | Record<string, unknown>;
}

interface BmcSupporterFields {
  supporter_id?: number | null;
  supporter_name?: string | null;
  supporter_email?: string | null;
}

interface BmcDonationData extends BmcSupporterFields {
  id: number;
  amount: number;
  object: string;                  // "payment"
  status?: string;
  message?: string;
  currency?: string;
  refunded?: string | boolean;
  created_at: number;
  refunded_at?: number | null;
  support_note?: string | null;
  transaction_id?: string | null;
  application_fee?: string | number | null;
  total_amount_charged?: string | number | null;
  coffee_count?: number | null;
  coffee_price?: number | null;
}

interface BmcSubscriptionData extends BmcSupporterFields {
  id: number;
  amount: number;
  object: string;                  // "recurring_donation" | "membership"
  status?: string;
  currency?: string;
  paused?: string | boolean;
  canceled?: string | boolean;
  cancel_at_period_end?: string | boolean;
  duration_type?: string;
  psp_id?: string;
  started_at: number;
  canceled_at?: number | null;
  current_period_start?: number | null;
  current_period_end?: number | null;
  support_note?: string | null;
  supporter_feedback?: string | null;
  // Memberships only
  membership_level_id?: number | null;
  membership_level_name?: string | null;
}

export type SubscriptionKind = 'recurring' | 'membership';

// ───────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────

function toBool(v: unknown, fallback = false): boolean {
  if (v === true || v === 'true') return true;
  if (v === false || v === 'false') return false;
  return fallback;
}

function toDecimalString(v: string | number | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v.toFixed(2);
  const trimmed = v.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function toDecimal(v: string | number | null | undefined): Prisma.Decimal | null {
  const s = toDecimalString(v);
  return s !== null ? new Prisma.Decimal(s) : null;
}

function unixSecondsToDate(s: number | null | undefined): Date | null {
  if (s === null || s === undefined) return null;
  return new Date(s * 1000);
}

// ───────────────────────────────────────────────────────────────────
// Supporter upsert
// ───────────────────────────────────────────────────────────────────

/**
 * Look up (or create) a Supporter row from the supporter fields on a
 * webhook payload. Returns the supporter row id, or null if the payload
 * has no `supporter_id` (anonymous coffee — keep the FK null).
 *
 * Updates the existing supporter's name/email + lastSeenAt on every call,
 * so we always have the most recent supporter info.
 */
async function upsertSupporter(fields: BmcSupporterFields): Promise<string | null> {
  const bmcId = fields.supporter_id;
  if (bmcId == null) return null;

  const now = new Date();
  const existing = await prisma.supporter.findUnique({
    where: { bmcSupporterId: bmcId },
    select: { id: true },
  });

  if (existing) {
    await prisma.supporter.update({
      where: { id: existing.id },
      data: {
        name: fields.supporter_name ?? undefined,
        email: fields.supporter_email ?? undefined,
        lastSeenAt: now,
      },
    });
    return existing.id;
  }

  const created = await prisma.supporter.create({
    data: {
      bmcSupporterId: bmcId,
      name: fields.supporter_name ?? null,
      email: fields.supporter_email ?? null,
      firstSeenAt: now,
      lastSeenAt: now,
    },
    select: { id: true },
  });
  return created.id;
}

// ───────────────────────────────────────────────────────────────────
// Donation (one-off payment) persistence
// ───────────────────────────────────────────────────────────────────

/**
 * Persist (or upsert) a donation from a BMC webhook payload.
 *
 * - Idempotent by `bmc_payment_id` — replays update the same row.
 * - Handles `donation.created` and `donation.refunded` (the latter flips
 *   `refunded = true` and sets `refunded_at`).
 * - Looks up / creates the supporter row first; FKs the donation to it.
 */
export async function persistBmcDonation(payload: BmcWebhookEnvelope) {
  const data = payload.data as BmcDonationData;
  if (!data || typeof data.id !== 'number') {
    throw new Error('BMC donation payload missing data.id — cannot persist.');
  }

  const supporterId = await upsertSupporter(data);

  const isRefund = payload.type === 'donation.refunded';
  const refunded = isRefund || toBool(data.refunded, false);
  const refundedAt = unixSecondsToDate(data.refunded_at ?? null);
  const bmcCreatedAt = unixSecondsToDate(data.created_at) ?? new Date();

  const baseFields = {
    type: payload.type,
    liveMode: !!payload.live_mode,
    amount: new Prisma.Decimal(data.amount?.toString() ?? '0'),
    currency: (data.currency || 'USD').slice(0, 8),
    coffeeCount: data.coffee_count ?? null,
    coffeePrice: data.coffee_price != null
      ? new Prisma.Decimal(data.coffee_price.toString())
      : null,
    totalAmountCharged: toDecimal(data.total_amount_charged ?? null),
    applicationFee: toDecimal(data.application_fee ?? null),
    supporterId,
    supportNote: data.support_note ?? null,
    message: data.message ?? null,
    status: data.status ?? null,
    refunded,
    refundedAt,
    transactionId: data.transaction_id ?? null,
    bmcCreatedAt,
    rawPayload: payload as unknown as Prisma.InputJsonValue,
  };

  return prisma.donation.upsert({
    where: { bmcPaymentId: data.id },
    create: {
      bmcPaymentId: data.id,
      ...baseFields,
    },
    update: baseFields,
  });
}

// ───────────────────────────────────────────────────────────────────
// Subscription (recurring_donation + membership) persistence
// ───────────────────────────────────────────────────────────────────

/**
 * Persist (or upsert) an ongoing subscription from BMC. Both
 * `recurring_donation.*` and `membership.*` events land here — distinguished
 * by the `kind` argument. BMC's id space overlaps between the two so the
 * unique key is `(kind, bmc_subscription_id)`.
 *
 * The `*.cancelled` event flips `canceled=true` + `status='canceled'` on the
 * existing row; we keep history rather than deleting.
 */
export async function persistBmcSubscription(
  payload: BmcWebhookEnvelope,
  kind: SubscriptionKind,
) {
  const data = payload.data as BmcSubscriptionData;
  if (!data || typeof data.id !== 'number') {
    throw new Error('BMC subscription payload missing data.id — cannot persist.');
  }

  const supporterId = await upsertSupporter(data);
  const bmcCreatedAt = unixSecondsToDate(data.started_at) ?? new Date();

  const baseFields = {
    kind,
    liveMode: !!payload.live_mode,
    amount: new Prisma.Decimal(data.amount?.toString() ?? '0'),
    currency: (data.currency || 'USD').slice(0, 8),
    durationType: data.duration_type ?? null,
    pspId: data.psp_id ?? null,
    status: data.status ?? 'unknown',
    paused: toBool(data.paused),
    canceled: toBool(data.canceled),
    cancelAtPeriodEnd: toBool(data.cancel_at_period_end),
    membershipLevelId: data.membership_level_id ?? null,
    membershipLevelName: data.membership_level_name ?? null,
    supporterId,
    supportNote: data.support_note ?? null,
    supporterFeedback: data.supporter_feedback ?? null,
    startedAt: unixSecondsToDate(data.started_at) ?? new Date(),
    canceledAt: unixSecondsToDate(data.canceled_at ?? null),
    currentPeriodStart: unixSecondsToDate(data.current_period_start ?? null),
    currentPeriodEnd: unixSecondsToDate(data.current_period_end ?? null),
    bmcCreatedAt,
    rawPayload: payload as unknown as Prisma.InputJsonValue,
  };

  return prisma.subscription.upsert({
    where: {
      kind_bmcSubscriptionId: {
        kind,
        bmcSubscriptionId: data.id,
      },
    },
    create: {
      bmcSubscriptionId: data.id,
      ...baseFields,
    },
    update: baseFields,
  });
}

// ───────────────────────────────────────────────────────────────────
// Stats
// ───────────────────────────────────────────────────────────────────

export interface DonationStats {
  // Money received in the rolling window
  count: number;
  total: number;
  currency: string;
  // Active recurring/membership subscribers (live mode, status=active, not canceled)
  activeSubscribers: number;
  since: string;
}

/**
 * Aggregate donation + subscription stats over a rolling window of `days`.
 * - `count` / `total`: live one-off donations not refunded in the window
 * - `activeSubscribers`: live subscriptions currently active (regardless of
 *   when they started — current state, not windowed)
 */
export async function getDonationStats(days = 30): Promise<DonationStats> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [donationRows, activeSubscribers] = await Promise.all([
    prisma.donation.findMany({
      where: {
        liveMode: true,
        refunded: false,
        bmcCreatedAt: { gte: since },
      },
      select: { amount: true, currency: true },
    }),
    prisma.subscription.count({
      where: {
        liveMode: true,
        status: 'active',
        canceled: false,
      },
    }),
  ]);

  const total = donationRows.reduce(
    (acc, r) => acc + Number(r.amount.toString()),
    0,
  );
  const currency = donationRows.length > 0 ? donationRows[0].currency : 'EUR';

  return {
    count: donationRows.length,
    total: Math.round(total * 100) / 100,
    currency,
    activeSubscribers,
    since: since.toISOString(),
  };
}
