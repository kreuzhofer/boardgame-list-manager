import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { EventService } from '../services/event.service';
import { resolveEventId } from '../middleware/event.middleware';

const router = Router();
const eventService = new EventService(prisma);

/**
 * POST /api/auth/verify
 * Verifies the provided password against the event password.
 * 
 * Request body: { password: string }
 * Response: 
 *   - 200 { success: true } if password matches
 *   - 401 { success: false, message: "Falsches Passwort" } if password is incorrect
 *   - 400 { success: false, message: "Bitte Passwort eingeben." } if password is missing
 */
router.post('/verify', async (req: Request, res: Response) => {
  const { password, eventId: bodyEventId } = req.body;

  // Check if password is provided
  if (!password || typeof password !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Bitte Passwort eingeben.',
    });
  }

  const eventId = typeof bodyEventId === 'string' ? bodyEventId : await resolveEventId(req);
  const isValid = await eventService.verifyEventPassword(eventId, password);

  if (isValid) {
    return res.json({ success: true });
  }

  return res.status(401).json({
    success: false,
    message: 'Falsches Passwort',
  });
});

export default router;
