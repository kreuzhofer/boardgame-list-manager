import { Router, Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { eventService } from '../services';

const router = Router();

/**
 * GET /api/events
 * List events owned by the authenticated account
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const events = await eventService.getEventsForOwner(authReq.account.id);
    res.json({ events });
  } catch (error) {
    console.error('List events error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Ein Fehler ist aufgetreten. Bitte später erneut versuchen.',
    });
  }
});

/**
 * POST /api/events
 * Create a new event
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { name, slug, password, status, description, welcomeMessage, startsAt, endsAt, location, capacity, notes, fees } = req.body;

    if (!name || !password) {
      res.status(400).json({
        error: 'MISSING_FIELDS',
        message: 'Name und Passwort sind erforderlich.',
      });
      return;
    }

    const event = await eventService.createEvent(authReq.account.id, {
      name, slug, password, status, description, welcomeMessage, startsAt, endsAt, location, capacity, notes, fees,
    });

    res.status(201).json({ event });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten.';
    if (message.includes('Slug') || message.includes('reserviert') || message.includes('vergeben')) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message });
      return;
    }
    console.error('Create event error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Ein Fehler ist aufgetreten. Bitte später erneut versuchen.',
    });
  }
});

/**
 * GET /api/events/by-slug/:slug
 * Public lookup — no auth required. Returns minimal event info for password screen.
 */
router.get('/by-slug/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const event = await eventService.getEventPublicInfo(slug);

    if (!event) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Event nicht gefunden.',
      });
      return;
    }

    res.json({ event });
  } catch (error) {
    console.error('Slug lookup error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Ein Fehler ist aufgetreten. Bitte später erneut versuchen.',
    });
  }
});

/**
 * GET /api/events/:id
 * Get event details (owner only)
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const event = await eventService.getEventForOwner(id, authReq.account.id);

    if (!event) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Event nicht gefunden.',
      });
      return;
    }

    res.json({ event });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Ein Fehler ist aufgetreten. Bitte später erneut versuchen.',
    });
  }
});

/**
 * PATCH /api/events/:id
 * Update event (owner only)
 */
router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { name, slug, password, status, description, welcomeMessage, startsAt, endsAt, location, capacity, notes, fees } = req.body;

    const event = await eventService.updateEvent(id, authReq.account.id, {
      name, slug, password, status, description, welcomeMessage, startsAt, endsAt, location, capacity, notes, fees,
    });

    res.json({ event });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten.';
    if (message.includes('nicht gefunden')) {
      res.status(404).json({ error: 'NOT_FOUND', message });
      return;
    }
    if (message.includes('Berechtigung')) {
      res.status(403).json({ error: 'FORBIDDEN', message });
      return;
    }
    if (message.includes('Slug') || message.includes('reserviert') || message.includes('vergeben')) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message });
      return;
    }
    console.error('Update event error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Ein Fehler ist aufgetreten. Bitte später erneut versuchen.',
    });
  }
});

export default router;
