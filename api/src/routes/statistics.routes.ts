import { Router, Request, Response } from 'express';
import { statisticsService } from '../services/statistics.service';
import { resolveEventId } from '../middleware/event.middleware';

const router = Router();

/**
 * GET /api/statistics
 * Returns statistics about the event including total games, participants,
 * available/requested games, and popular games ranking.
 * 
 * Response: StatisticsData
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const eventId = await resolveEventId(_req);
    const statistics = await statisticsService.getStatistics(eventId);
    return res.json(statistics);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ein Fehler ist aufgetreten.',
      },
    });
  }
});

/**
 * GET /api/statistics/timeline
 * Returns timeline statistics for games and player additions grouped by day.
 */
router.get('/timeline', async (_req: Request, res: Response) => {
  try {
    const eventId = await resolveEventId(_req);
    const timeline = await statisticsService.getTimeline(eventId);
    return res.json(timeline);
  } catch (error) {
    console.error('Error fetching statistics timeline:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ein Fehler ist aufgetreten.',
      },
    });
  }
});

export default router;
