import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getDonationStats } from '../services/donation.service';

const router = Router();

/**
 * GET /api/donations/stats?days=30
 * Aggregate donation count + total over a rolling window. Excludes
 * test-mode and refunded donations.
 *
 * Available to any authenticated account_owner — used to render the
 * "Letzten Monat: X Spenden, Y €" line in the organizer donate card.
 */
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const daysParam = parseInt(String(req.query.days ?? '30'), 10);
    const days = Number.isFinite(daysParam) && daysParam > 0 && daysParam <= 365 ? daysParam : 30;
    const stats = await getDonationStats(days);
    res.json(stats);
  } catch (err) {
    console.error('Donation stats error:', err);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Spendenstatistik konnte nicht geladen werden.',
    });
  }
});

export default router;
