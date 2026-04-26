import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';

/**
 * Buy Me a Coffee webhook payload — fields observed from a real
 * `donation.created` event in production (2026-04-26). String/number mixing
 * is exactly as BMC sends it; we coerce on persist.
 */
export interface BmcWebhookEnvelope {
  type: string;                    // e.g. "donation.created"
  live_mode: boolean;
  attempt?: number;
  created?: number;                // unix seconds
  event_id?: number;
  data: BmcDonationData | Record<string, unknown>;
}

interface BmcDonationData {
  id: number;
  amount: number;
  object: string;                  // "payment"
  status?: string;                 // "succeeded" | …
  message?: string;
  currency?: string;
  refunded?: string;               // "true" | "false" — yes, string
  created_at: number;              // unix seconds
  refunded_at?: number | null;
  support_note?: string | null;
  support_type?: string | null;
  supporter_name?: string | null;
  supporter_id?: number | null;
  supporter_email?: string | null;
  transaction_id?: string | null;
  application_fee?: string | number | null;
  total_amount_charged?: string | number | null;
  coffee_count?: number | null;
  coffee_price?: number | null;
}

function toDecimalString(v: string | number | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v.toFixed(2);
  const trimmed = v.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function unixSecondsToDate(s: number | null | undefined): Date | null {
  if (!s) return null;
  return new Date(s * 1000);
}

/**
 * Persist (or upsert) a donation from a BMC webhook payload.
 *
 * - Idempotent: keyed by `bmc_payment_id` (data.id). Repeated deliveries
 *   from BMC retries update the existing row instead of duplicating.
 * - Records both `donation.created` and `donation.refunded` (the latter
 *   flips `refunded = true`).
 * - Stores the full raw payload for forensics.
 *
 * Returns the persisted Donation row.
 */
export async function persistBmcDonation(payload: BmcWebhookEnvelope) {
  const data = payload.data as BmcDonationData;
  if (!data || typeof data.id !== 'number') {
    throw new Error('BMC payload missing data.id — cannot persist.');
  }

  const isRefund = payload.type === 'donation.refunded';
  // BMC sends `refunded` as a stringified boolean ("true" / "false") on
  // donation.created — accept actual booleans defensively too.
  const refundedFlag = data.refunded as unknown;
  const refunded = isRefund || refundedFlag === 'true' || refundedFlag === true;
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
    totalAmountCharged: toDecimalString(data.total_amount_charged ?? null) !== null
      ? new Prisma.Decimal(toDecimalString(data.total_amount_charged ?? null) as string)
      : null,
    applicationFee: toDecimalString(data.application_fee ?? null) !== null
      ? new Prisma.Decimal(toDecimalString(data.application_fee ?? null) as string)
      : null,
    supporterId: data.supporter_id ?? null,
    supporterName: data.supporter_name ?? null,
    supporterEmail: data.supporter_email ?? null,
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

/**
 * Aggregate donation stats over a rolling window of `days` days.
 * Excludes test-mode and refunded donations.
 *
 * Returned `total` is summed naively across currencies — for the small
 * single-currency reality of one BMC account this is fine; if a non-USD
 * donation arrives we'll cross that bridge.
 */
export async function getDonationStats(days = 30): Promise<{
  count: number;
  total: number;
  currency: string;
  since: string;
}> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await prisma.donation.findMany({
    where: {
      liveMode: true,
      refunded: false,
      bmcCreatedAt: { gte: since },
    },
    select: { amount: true, currency: true },
  });

  const total = rows.reduce(
    (acc, r) => acc + Number(r.amount.toString()),
    0,
  );
  const currency = rows.length > 0 ? rows[0].currency : 'EUR';

  return {
    count: rows.length,
    total: Math.round(total * 100) / 100,
    currency,
    since: since.toISOString(),
  };
}
