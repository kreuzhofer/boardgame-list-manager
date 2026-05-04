import { Router, Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { eventService } from '../services';
import { EventError } from '../services/event.service';

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

/**
 * GET /api/events/:id/deletion-preview
 * Returns counts of substantive data inside the event so the
 * delete-confirmation modal can show "what's at stake". Owner only.
 */
router.get('/:id/deletion-preview', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const preview = await eventService.getDeletionPreview(id, authReq.account.id);
    res.json({ preview });
  } catch (error) {
    if (error instanceof EventError) {
      res.status(error.statusCode).json({ error: error.code, message: error.message });
      return;
    }
    console.error('Deletion preview error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Ein Fehler ist aufgetreten. Bitte später erneut versuchen.',
    });
  }
});

/**
 * DELETE /api/events/:id
 * Owner-only. Empty events (no games, no participants) are hard-deleted.
 * Non-empty events are soft-deleted: slug renamed to `<original>-deleted[-N]`,
 * deletedAt set, with a 30-day undelete window before purge.
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const result = await eventService.deleteEvent(id, authReq.account.id);
    res.json({
      success: true,
      kind: result.kind,
      deletedAt: result.deletedAt?.toISOString() ?? null,
      purgeAt: result.purgeAt?.toISOString() ?? null,
      renamedSlug: result.renamedSlug,
      message:
        result.kind === 'hard'
          ? 'Treff gelöscht.'
          : 'Treff zur Löschung markiert. Du kannst ihn 30 Tage lang wiederherstellen.',
    });
  } catch (error) {
    if (error instanceof EventError) {
      res.status(error.statusCode).json({ error: error.code, message: error.message });
      return;
    }
    console.error('Delete event error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Ein Fehler ist aufgetreten. Bitte später erneut versuchen.',
    });
  }
});

/**
 * POST /api/events/:id/undelete
 * Body: { slug?: string }
 * Owner-only. Restores a soft-deleted event. The chosen slug must be
 * free; SLUG_TAKEN (409) lets the modal surface an inline error so
 * the user can pick a different one.
 */
router.post('/:id/undelete', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const slug = typeof req.body?.slug === 'string' ? req.body.slug : null;
    const event = await eventService.undeleteEvent(id, authReq.account.id, slug);
    res.json({ event });
  } catch (error) {
    if (error instanceof EventError) {
      res.status(error.statusCode).json({ error: error.code, message: error.message });
      return;
    }
    console.error('Undelete event error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Ein Fehler ist aufgetreten. Bitte später erneut versuchen.',
    });
  }
});

export default router;
