import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { config } from '../config';

const router = Router();

// BMC and similar services typically send the HMAC signature in one of these
// header names. We try each — once we capture a real payload from production,
// we'll know which one to lock in.
const SIGNATURE_HEADER_CANDIDATES = [
  'x-signature-sha256',
  'x-signature',
  'x-bmc-signature',
  'x-webhook-signature',
];

/**
 * Compute HMAC-SHA256 hex digest over the raw request body.
 * Returns lowercase hex without any prefix.
 */
function computeHmac(rawBody: Buffer, secret: string): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

/**
 * Compare two signature strings in constant time. Tolerates:
 *   - lower/upper case hex
 *   - optional `sha256=` prefix
 */
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
 * Buy Me a Coffee webhook receiver — discovery / dev mode.
 *
 * Logs full headers + body so we can capture real payloads from production.
 * If `BMC_WEBHOOK_SECRET` is configured, computes the expected HMAC-SHA256
 * over the raw body and reports whether any of the candidate signature headers
 * matched. Mismatches are **still accepted** for now — once we've seen one
 * real payload and know the exact header name, the handler will switch to
 * rejecting bad signatures with 401.
 */
router.post('/bmc', (req: Request, res: Response) => {
  const ts = new Date().toISOString();
  const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
  const secret = config.webhooks.bmcSecret;

  let signatureReport:
    | { mode: 'no-secret-configured' }
    | { mode: 'no-raw-body' }
    | {
        mode: 'checked';
        expected: string;
        matchedHeader: string | null;
        candidates: Array<{ header: string; provided: string; matches: boolean }>;
      };

  if (!secret) {
    signatureReport = { mode: 'no-secret-configured' };
  } else if (!rawBody) {
    signatureReport = { mode: 'no-raw-body' };
  } else {
    const expected = computeHmac(rawBody, secret);
    const candidates = SIGNATURE_HEADER_CANDIDATES.flatMap((header) => {
      const provided = req.header(header);
      if (!provided) return [];
      return [{
        header,
        provided,
        matches: signaturesMatch(provided, expected),
      }];
    });
    const matched = candidates.find((c) => c.matches);
    signatureReport = {
      mode: 'checked',
      expected,
      matchedHeader: matched?.header ?? null,
      candidates,
    };
  }

  console.log('=== BMC webhook ===');
  console.log(`[${ts}] method=${req.method} path=${req.path} ip=${req.ip}`);
  console.log(`[${ts}] headers=${JSON.stringify(req.headers, null, 2)}`);
  console.log(`[${ts}] body=${JSON.stringify(req.body, null, 2)}`);
  console.log(`[${ts}] signature_check=${JSON.stringify(signatureReport, null, 2)}`);
  console.log('=== /BMC webhook ===');

  // BMC expects a 2xx within a short timeout — respond immediately.
  res.status(200).json({ ok: true, receivedAt: ts });
});

export default router;
