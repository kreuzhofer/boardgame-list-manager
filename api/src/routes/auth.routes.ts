import { Router, Request, Response } from 'express';
import { eventService } from '../services/event.service';
import { eventTokenService } from '../services/event-token.service';
import { resolveEventId } from '../middleware/event.middleware';
import { resolveOptionalAccount } from '../middleware/auth.middleware';
import { ParticipationService } from '../services/participation.service';
import { prisma } from '../db/prisma';

const router = Router();
const participationService = new ParticipationService(prisma);

/**
 * POST /api/auth/verify
 * Verifies the provided password against the event password.
 * 
 * Request body: { password: string }
 * Response: 
 *   - 200 { success: true, token: "eyJ..." } if password matches
 *   - 401 { success: false, message: "Falsches Passwort" } if password is incorrect
 *   - 400 { success: false, message: "Bitte Passwort eingeben." } if password is missing
 */
router.post('/verify', async (req: Request, res: Response) => {
  const { password, eventId: bodyEventId, slug } = req.body;

  // Check if password is provided
  if (!password || typeof password !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Bitte Passwort eingeben.',
    });
  }

  // Resolve event: slug → eventId → header/query → default
  let eventId: string;
  if (typeof slug === 'string') {
    const event = await eventService.getEventBySlug(slug);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event nicht gefunden.',
      });
    }
    eventId = event.id;
  } else {
    eventId = typeof bodyEventId === 'string' ? bodyEventId : await resolveEventId(req);
  }

  const isValid = await eventService.verifyEventPassword(eventId, password);

  if (isValid) {
    const token = eventTokenService.sign(eventId);

    // Phase 2: if the request also carries a valid Account JWT, upsert
    // an EventParticipation AND a per-event User row keyed on
    // accountId. The frontend uses the returned `participant` to skip
    // the participant-pick modal and use the auto-resolved identity.
    // Failures here must not block the verify response — log and
    // continue with `participant: null` so the modal still appears.
    let participant: { id: string; name: string } | null = null;
    const account = await resolveOptionalAccount(req);
    if (account) {
      try {
        await participationService.ensureParticipation({
          eventId,
          accountId: account.id,
        });
        const accountDetail = await prisma.account.findUnique({
          where: { id: account.id },
          select: { displayName: true },
        });
        participant = await participationService.ensureUserForAccount({
          eventId,
          accountId: account.id,
          displayName: accountDetail?.displayName ?? null,
          email: account.email,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `[participation] ensure failed event=${eventId} account=${account.id}: ${msg}`,
        );
      }
    }

    return res.json({ success: true, token, participant });
  }

  return res.status(401).json({
    success: false,
    message: 'Falsches Passwort',
  });
});

export default router;
