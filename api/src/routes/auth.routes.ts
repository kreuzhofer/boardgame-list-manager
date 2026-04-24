import { Router, Request, Response } from 'express';
import { eventService } from '../services/event.service';
import { eventTokenService } from '../services/event-token.service';
import { resolveEventId } from '../middleware/event.middleware';

const router = Router();

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
    return res.json({ success: true, token });
  }

  return res.status(401).json({
    success: false,
    message: 'Falsches Passwort',
  });
});

export default router;
