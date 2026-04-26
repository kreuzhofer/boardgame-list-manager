import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { persistBmcDonation, type BmcWebhookEnvelope } from '../services/donation.service';

const router = Router();

// BMC sends the HMAC-SHA256 signature in this header (confirmed against a
// real production payload, 2026-04-26).
const BMC_SIGNATURE_HEADER = 'x-signature-sha256';

function computeHmac(rawBody: Buffer, secret: string): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

function signaturesMatch(provided: string, expected: string): boolean {
  if (!provided) return false;
  const normalised = provided.replace(/^sha256=/i, '').trim().toLowerCase();
  const want = expected.toLowerCase();
  if (normalised.length !== want.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(normalised), Buffer.from(want));
  } catch {
    return false;
  }
}

/**
 * POST /api/webhooks/bmc
 * Buy Me a Coffee webhook receiver.
 *
 * Auth: HMAC-SHA256 signature in `X-Signature-Sha256` header, computed over
 * the raw request body using `BMC_WEBHOOK_SECRET`. Mismatches → 401.
 *
 * Behaviour:
 *  - `donation.created` / `donation.refunded` → upserted into `donations`
 *    table (idempotent by BMC payment id).
 *  - Other event types (membership.*, extra.*, …) → logged + 200, no
 *    persistence yet. Add handlers as we encounter them.
 *  - Test-mode events (`live_mode === false`) are still persisted but flagged
 *    so they don't pollute donation stats.
 */
router.post('/bmc', async (req: Request, res: Response) => {
  const ts = new Date().toISOString();
  const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
  const secret = config.webhooks.bmcSecret;

  // ── Signature verification ──────────────────────────────────────────
  if (!secret) {
    console.error(`[${ts}] BMC webhook: BMC_WEBHOOK_SECRET not configured — rejecting.`);
    res.status(503).json({ error: 'WEBHOOK_NOT_CONFIGURED' });
    return;
  }
  if (!rawBody) {
    console.error(`[${ts}] BMC webhook: raw body unavailable — rejecting.`);
    res.status(400).json({ error: 'BAD_REQUEST' });
    return;
  }

  const provided = req.header(BMC_SIGNATURE_HEADER);
  const expected = computeHmac(rawBody, secret);
  if (!provided || !signaturesMatch(provided, expected)) {
    console.warn(
      `[${ts}] BMC webhook: signature mismatch ` +
        `(provided=${provided ?? 'none'} expected=${expected})`,
    );
    res.status(401).json({ error: 'BAD_SIGNATURE' });
    return;
  }

  // ── Dispatch by event type ──────────────────────────────────────────
  const payload = req.body as BmcWebhookEnvelope;
  const type = payload?.type ?? 'unknown';

  console.log(`[${ts}] BMC webhook: type=${type} live_mode=${payload?.live_mode}`);

  try {
    switch (type) {
      case 'donation.created':
      case 'donation.refunded': {
        const row = await persistBmcDonation(payload);
        console.log(
          `[${ts}] BMC donation persisted: id=${row.id} ` +
            `bmc_payment_id=${row.bmcPaymentId} amount=${row.amount} ${row.currency} ` +
            `live_mode=${row.liveMode} refunded=${row.refunded}`,
        );
        break;
      }
      default:
        // Unknown type — log full payload so we can decide how to handle it.
        console.log(
          `[${ts}] BMC webhook: unhandled type=${type} body=${JSON.stringify(payload, null, 2)}`,
        );
    }
  } catch (err) {
    // Don't 500 — BMC will retry hard on 5xx, which we want to avoid for
    // bugs in our handler. Log and acknowledge.
    console.error(`[${ts}] BMC webhook: handler error`, err);
  }

  res.status(200).json({ ok: true, receivedAt: ts });
});

export default router;
